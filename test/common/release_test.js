import * as release from '#internal/common/release.js'

describe('release', () => {
  describe('channel', () => {
    it('is valid name', () => {
      expect(release.channel).to.be.oneOf(['latest', 'beta', 'alpha'])
    })
  })
})
