import { BLANK, get } from '../common/util.js'

export const getEsperViewState = ({ esper, nav }) =>
  get(esper.view, [nav.photo], BLANK)
