import { capitalize } from '#lodash'
import { greeting as fromNamedAlias } from '#src/greeting'
import { greeting as fromSlashAlias } from '#/greeting'

export default function Page() {
  return (
    <h1>
      {capitalize(fromNamedAlias)} / {fromSlashAlias}
    </h1>
  )
}
