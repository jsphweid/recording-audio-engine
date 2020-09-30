import { flattenFloat32Arrays } from "./helpers";

describe("helpers", () => {
  describe("flattenFloat32Arrays", () => {
    it("should work given a basic case", () => {
      const result = flattenFloat32Arrays([
        new Float32Array([1, 2, 3]),
        new Float32Array([1, 2, 3]),
      ]);

      expect(result).toEqual(new Float32Array([1, 2, 3, 1, 2, 3]));
    });
  });
});
