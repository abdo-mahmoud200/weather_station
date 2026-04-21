import { useParams } from 'react-router-dom'
import DetailView from '../components/station/DetailView'

export default function StationDetail() {
  const { id } = useParams()
  return <DetailView stationId={id} />
}
