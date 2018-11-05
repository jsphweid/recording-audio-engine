import MonoRecording from './mono-recording'
import { makeSynthesizedMonoRecording } from './synthesizer'

describe('synthesizer', () => {
  describe('makeSynthesizedMonoRecording', () => {
    it('should synthesize 2 mono recordings into 1', () => {
      const recording1 = new MonoRecording(new Float32Array([1, 2, 3]))
      const recording2 = new MonoRecording(new Float32Array([2, 3, 4]))
      const expectedResult = new MonoRecording(new Float32Array([3, 5, 7]))
      expect(makeSynthesizedMonoRecording([recording1, recording2])).toEqual(
        expectedResult
      )
    })
  })
})
