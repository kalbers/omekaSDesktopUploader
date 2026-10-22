import { basename } from 'node:path'
import { useIntl } from 'react-intl'
import { useIpcSend } from '../../hooks/use-ipc.js'
import { Button } from '../button.js'
import { FileIcon } from '../photo/file-icon.js'
import { bytes, datetime } from '../../format.js'

const Detail = ({ label, value, title }) => (
  <>
    <dt>{label}</dt>
    <dd title={title}>{value}</dd>
  </>
)

// Stands in for the image viewer when the selected file isn't an image.
export const FileViewer = ({ photo }) => {
  let intl = useIntl()
  let open = useIpcSend(['shell', 'open'])
  let show = useIpcSend(['shell', 'show'])

  let t = (id) => intl.formatMessage({ id })
  let name = photo?.filename || (photo?.path && basename(photo.path))

  return (
    <section className="esper file-viewer">
      {photo && (
        <div className="file-viewer-content">
          <FileIcon mimetype={photo.mimetype}/>
          <h2 className="truncate" title={photo.path}>{name}</h2>

          {photo.broken && (
            <p className="file-missing">{t('file.missing')}</p>
          )}

          <dl>
            <Detail label={t('photo.type')} value={photo.mimetype}/>
            <Detail label={t('photo.size')} value={bytes(photo.size)}/>
            <Detail
              label={t('photo.created')}
              value={datetime(photo.created)}/>
            <Detail
              label={t('file.location')}
              title={photo.path}
              value={photo.path}/>
          </dl>

          <div className="actions">
            <Button
              isDisabled={photo.broken}
              text="file.open"
              onClick={() => open(photo.path)}/>
            <Button
              text="file.show"
              onClick={() => show(photo.path)}/>
          </div>
        </div>
      )}
    </section>
  )
}
