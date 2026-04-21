import { useParams } from 'react-router-dom'
import StationControlPanel from '../components/station/ControlPanel'

export default function ControlPanel() {
  const { id } = useParams()
  return <StationControlPanel stationId={id} />
}
