import CommercialVisit from './execution/CommercialVisit.jsx'
import EquipmentVisit from './execution/EquipmentVisit.jsx'
import PreventiveMaintenanceVisit from './execution/PreventiveMaintenanceVisit.jsx'
import SupportVisit from './execution/SupportVisit.jsx'

// Pantalla de visita en curso según el tipo de visita.
// onSaved(visit, action) con action 'save' | 'finish'.
function VisitExecution(props) {
  switch (props.visit.type) {
    case 'pm':
      return <PreventiveMaintenanceVisit {...props} />
    case 'hotline':
    case 'otros_soportes':
      return <SupportVisit {...props} />
    case 'instalacion':
    case 'retiro':
      return <EquipmentVisit {...props} />
    default:
      return <CommercialVisit {...props} />
  }
}

export default VisitExecution
