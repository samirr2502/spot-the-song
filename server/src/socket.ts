import type { Server as HttpServer } from 'node:http'
import type { GameRoom } from '@spot-the-song/shared'
import { Server } from 'socket.io'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@spot-the-song/shared'
import { corsOriginCallback } from './clientOrigin.js'
import { roomManager } from './rooms/RoomManager.js'

function safeCallback<T>(
  callback: ((result: T) => void) | undefined,
  result: T,
) {
  try {
    callback?.(result)
  } catch (error) {
    console.error('Socket callback failed:', error)
  }
}

function handleSocketError(
  callback: ((result: { ok: false; message: string }) => void) | undefined,
  error: unknown,
) {
  console.error('Socket handler failed:', error)
  safeCallback(callback, {
    ok: false,
    message: error instanceof Error ? error.message : 'Something went wrong on the server.',
  })
}

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
      origin: corsOriginCallback(clientOrigin),
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
      try {
        const result = await roomManager.createRoom(
          payload.playerName,
          payload.settings,
          payload.spotifyUrl,
        )

        if (!result.ok) {
          safeCallback(callback, result)
          return
        }

        await attachPlayerToRoom(io, socket, result.room, result.player.id, result.sessionToken)
        callback({
          ok: true,
          code: result.room.code,
          playerId: result.player.id,
          sessionToken: result.sessionToken,
        })
      } catch (error) {
        handleSocketError(callback, error)
      }
    })

    socket.on('client:join-room', async (payload, callback) => {
      try {
        const result = roomManager.joinRoom(payload.code, payload.playerName)

        if (!result.ok) {
          safeCallback(callback, result)
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
      } catch (error) {
        handleSocketError(callback, error)
      }
    })

    socket.on('client:reconnect-room', async (payload, callback) => {
      try {
        const result = roomManager.reconnect(payload.sessionToken)

        if (!result.ok) {
          safeCallback(callback, { ok: false, message: result.message })
          return
        }

        await attachPlayerToRoom(io, socket, result.room, result.player.id, result.sessionToken)

        const lastResults = roomManager.getLastRoundResults(result.room.id)
        if (lastResults && result.room.status === 'round-results') {
          socket.emit('server:round-results', lastResults)
        }

        callback({ ok: true })
      } catch (error) {
        handleSocketError(callback, error)
      }
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

    socket.on('client:submit-votes', (payload, callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.submitVotes(roomId, playerId, payload)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      callback({ ok: true })
    })

    socket.on('client:submit-rating', (payload, callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.submitRating(roomId, playerId, payload)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      callback({ ok: true })
    })

    socket.on('client:place-card', (payload, callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.placeCard(roomId, playerId, payload)
      if (!result.ok) {
        callback(result)
        return
      }

      emitRoomState(io, result.room)
      callback({ ok: true })
    })

    socket.on('client:submit-timeline-bonus', (payload, callback) => {
      const { playerId, roomId } = socket.data
      if (!playerId || !roomId) {
        callback({ ok: false, message: 'You are not in a room.' })
        return
      }

      const result = roomManager.submitTimelineBonus(roomId, playerId, payload)
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
