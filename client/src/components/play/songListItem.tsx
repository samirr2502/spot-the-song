import { useSortable } from "@dnd-kit/sortable"
import {CSS} from "@dnd-kit/utilities"
interface SongListItemProps{
    id:number,
    title:string,
    artist:string,
    year:number,

}
const SongListItem =(props:SongListItemProps)=>{
    
    const {attributes, listeners,setNodeRef, transform, transition}= useSortable({id: props.id})
    const style = {
        transition,
        transform: CSS.Transform.toString(transform)
    }

    return(
        <div ref={setNodeRef} {...attributes} {...listeners} 
        style = {style} className="song-list-item">
            {props.title} by {props.artist} ({props.year})
        </div>
    )
}

export default SongListItem