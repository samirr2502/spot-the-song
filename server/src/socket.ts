import type { Server as HttpServer } from 'node:http'
import type { GameRoom } from '@spot-the-song/shared'
import { Server } from 'socket.io'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@spot-the-song/shared'
import { roomManager } from './rooms/RoomManager.js'

function emitRoomState(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  room: GameRoom,
) {
  io.to(room.id).emit('server:room-state', room)
}

async function attachPlayerToRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: import('socket.io').Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  room: GameRoom,
  playerId: string,
  sessionToken: string,
) {
  socket.data.playerId = playerId
  socket.data.roomId = room.id
  socket.data.sessionToken = sessionToken
  await socket.join(room.id)
  emitRoomState(io, room)
}

export function attachSocketHandlers(httpServer: HttpServer, clientOrigin: string) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST'],
    },
  })

  roomManager.setEmitHandlers({
    onRoomUpdated: (room) => emitRoomState(io, room),
    onRoundResults: (roomId, payload) => {
      io.to(roomId).emit('server:round-results', payload)
      const room = roomManager.getPublicRoom(roomId)
      if (room) emitRoomState(io, room)
    },
  })

  io.on('connection', (socket) => {
    socket.emit('server:connected', { serverTime: Date.now() })

    socket.on('client:ping', (callback) => {
      callback({ serverTime: Date.now() })
    })

    socket.on('client:create-room', async (payload, callback) => {
      const result = await roomManager.createRoom(
        payload.playerName,
        payload.settings,
        payload.spotifyUrl,
      )

      if (!result.ok) {
        callback(result)
        return
      }

      await attachPlayerToRoom(io, socket, result.room, result.player.id, result.sessionToken)
      callback({
        ok: true,
        code: result.room.code,
        playerId: result.player.id,
        sessionToken: result.sessionToken,
      })
    })

    socket.on('client:join-room', async (payload, callback) => {
      const result = roomManager.joinRoom(payload.code, payload.playerName)

      if (!result.ok) {
        callback(result)
        return
      }

      await attachPlayerToRoom(io, socket, result.room, result.player.id, result.sessionToken)
      io.to(result.room.id).emit('server:player-joined', { playerId: result.player.id })

      callback({
        ok: true,
        code: result.room.code,
        playerId: result.player.id,
        sessionToken: result.sessionToken,
      })
    })

    socket.on('client:reconnect-room', async (payload, callback) => {
      const result = roomManager.reconnect(payload.sessionToken)

      if (!result.ok) {
        callback({ ok: false, message: result.message })
        return
      }

      await attachPlayerToRoom(io, socket, result.room, result.player.id, result.sessionToken)

      const lastResults = roomManager.getLastRoundResults(result.room.id)
      if (lastResults && result.room.status === 'round-results') {
        socket.emit('server:round-results', lastResults)
      }

      callback({ ok: true })
    })

    socket.on('client:start-game', (callback) => {
      const { playerId, roomId } = socket.data

      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.startGame(roomId, playerId)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      io.to(roomId).emit('server:phase-changed', { status: result.room.status })
      callback({ ok: true })
    })

    socket.on('client:ack-how-to-play', (callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.ackHowToPlay(roomId, playerId)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      if (result.room.status === 'playing') {
        io.to(roomId).emit('server:phase-changed', { status: result.room.status })
      }
      callback({ ok: true })
    })

    socket.on('client:submit-answers', (payload, callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.submitAnswers(roomId, playerId, payload)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      callback({ ok: true })
    })

    socket.on('client:continue-after-results', (callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.continueAfterResults(roomId, playerId)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      io.to(roomId).emit('server:phase-changed', { status: result.room.status })
      callback({ ok: true })
    })

    socket.on('client:play-again', (callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.playAgain(roomId, playerId)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      io.to(roomId).emit('server:phase-changed', { status: result.room.status })
      callback({ ok: true })
    })

    socket.on('client:leave-room', (callback) => {
      const { playerId, roomId } = socket.data

      if (!playerId || !roomId) {
        callback?.({ ok: true })
        return
      }

      const room = roomManager.leaveRoom(playerId, roomId)

      socket.data.playerId = undefined
      socket.data.roomId = undefined
      socket.data.sessionToken = undefined
      void socket.leave(roomId)

      if (room) {
        emitRoomState(io, room)
        io.to(roomId).emit('server:player-left', { playerId })
      }

      callback?.({ ok: true })
    })

    socket.on('disconnect', () => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) return

      const room = roomManager.markDisconnected(playerId, roomId)
      if (room) {
        emitRoomState(io, room)
      }
    })
  })

  return io
}
