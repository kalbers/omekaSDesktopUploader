import { app } from 'electron'
import { Tropy } from '#internal/main/tropy.js'

const fakeWindow = () => ({
  show: sinon.spy(),
  setTitle: sinon.spy(),
  webContents: {
    send: sinon.spy()
  }
})

describe('Tropy', () => {
  let tropy

  beforeEach(() => {
    delete Tropy.instance

    tropy = new Tropy({
      data: app.getPath('userData')
    })
  })

  afterEach(() => {
    delete Tropy.instance
  })

  it('is a singleton class', () => {
    expect(tropy).to.equal(Tropy.instance)
    expect(tropy).to.equal(new Tropy())
  })

  describe('showProjectWindow', () => {
    let win
    let project = { path: 'x.tpy' }

    beforeEach(() => {
      win = fakeWindow()

      tropy.state = { recents: [], win: { bounds: {} } }
      tropy.setProject(project, win)

      sinon.stub(tropy.wm, 'map').returns([win])
      sinon.stub(tropy.wm, 'open')
    })

    afterEach(() => {
      tropy.setProject(null, win)

      tropy.wm.map.restore()
      tropy.wm.open.restore()
    })

    it('focus window if project already open', async () => {
      await tropy.showProjectWindow(project.path, null)

      expect(win.show).to.have.been.called
      expect(tropy.wm.open).not.to.have.been.called
    })

    it('new window if not already open', async () => {
      await tropy.showProjectWindow('other.tpy', null)

      expect(win.show).not.to.have.been.called
      expect(tropy.wm.open).to.have.been.calledOnce

      let call = tropy.wm.open.getCall(0)

      expect(call.args[0]).to.eql('project')
      expect(call.args[1]).to.have.property('file', 'other.tpy')
    })

    it('open in existing window if given', async () => {
      await tropy.showProjectWindow('other.tpy', win)

      expect(tropy.wm.open).not.to.have.been.called

      expect(win.show).to.have.been.called
      expect(win.webContents.send).to.have.been.calledOnce

      let [type, action] = win.webContents.send.getCall(0).args

      expect(type).to.eql('dispatch')
      expect(action.payload).to.eql('other.tpy')
    })
  })
})
