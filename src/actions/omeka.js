import { OMEKA } from '../constants/index.js'
import { array } from '../common/util.js'

export default {
  // Uploads the given items to Omeka S, or the items in the current view.
  upload(payload, meta) {
    return {
      type: OMEKA.UPLOAD,
      payload: array(payload),
      meta: { cmd: 'project', ...meta }
    }
  }
}
