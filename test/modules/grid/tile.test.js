import Tile from "../../../src/modules/grid/Tile";
import chai from "chai";
const expect = chai.expect;

describe("Tile", () => {
  it("should be instantiable with an initial state object", () => {
    const hotTile = new Tile({ temperature: 110 });
    expect(hotTile).to.be.ok;
    expect(hotTile.get("temperature")).to.equal(110);
  });

  describe("properties", () => {
    it("should be retrievable", () => {
      const dogeTile = new Tile({ dogeLevel: 9001 });
      expect(dogeTile.get("dogeLevel")).to.be.above(9000);
    });

    it("should return undefined for nonexistent keys", () => {
      const emptyTile = new Tile(/* No properties */);
      const result = emptyTile.get("oops");
      expect(result).to.be.undefined;
    });

    it("should be mutable", () => {
      /* Create the island! */
      const island = new Tile({ elevation: 200 });
      expect(island.get("elevation")).to.equal(200);

      /* Sink the island! */
      island.set("elevation", -150);
      expect(island.get("elevation")).to.equal(-150);
    });

    it("should be created if they don't yet exist", () => {
      const freshTile = new Tile(/* No initial properties */);
      expect(freshTile.get("habitable")).to.not.be.defined;
      freshTile.set("habitable", true);
      expect(freshTile.get("habitable")).to.be.true;
    });

    it("set function is chainable", () => {
      const numberTile = new Tile();
      numberTile.set("one", 1).set("two", 2).set("three", 3);
      expect(numberTile.get("one")).to.equal(1);
      expect(numberTile.get("two")).to.equal(2);
      expect(numberTile.get("three")).to.equal(3);
    });

    it("can be deleted", () => {
      const coldTile = new Tile({ temperature: -30 });

      expect(coldTile.get("temperature")).to.equal(-30);
      let didDelete = coldTile.delete("temperature");
      expect(didDelete).to.be.true;
      expect(coldTile.get("temperature")).to.be.undefined;

      didDelete = coldTile.delete("Non-existant key");
      expect(didDelete).to.be.false;
    });
  });
});