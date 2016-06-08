import PlantRenderer from "./PlantRenderer";
import Coord from "../../core/components/Coord";
import HexGrid from "../../../grid/HexGrid";
import { expect } from "chai";
import { stub, spy } from "sinon";

describe.skip("PlantRenderer", () => {
  let sys, grid, paper, app;

  beforeEach(() => {
    sys = new PlantRenderer();
    grid = new HexGrid(1);

    // Stub out the dependencies
    paper = {
      Path: {
        Line: stub().returns({
          rotate: stub()
        })
      },
      Symbol: stub().returns({
        place: stub().returns({
          remove: stub()
        })
      }),
      Point: stub().returns({
        add: stub()
      }),
      Color: stub(),
      Group: stub().returns({
        addChild: stub()
      }),
      Layer: stub().returns({
        addChild: stub()
      }),
      view: {
        // Pretend the view is 800x600
        center: { x: 400, y: 300 }
      }
    };
    app = {
      grid,
      paper
    };
  });

  it("should be tagged as 'renderer'", () => {
    expect(sys.tag).to.equal("renderer");
  });

  describe("initialize", () => {
    it("should prebuild the plant graphic", () => {
      const { Group, Path, Symbol } = app.paper;
      sys.initialize(app);
      expect(Group.calledWithNew()).to.be.true;
      expect(Path.Line.calledWithNew()).to.be.true;
      expect(Symbol.calledWithNew()).to.be.true;
    });
  });

  describe("draw", () => {
    beforeEach(() => {
      sys.initialize(app);
      grid.getTile(new Coord(0, 0)).set("plant", {});
      grid.getTile(new Coord(1, 0)).set("plant", {});
      grid.getTile(new Coord(0, 1)).set("plant", {});
    });

    it("should place and store a plant symbol for tiles with vegetation ONCE", () => {
      const { Symbol } = app.paper;
      sys.draw(app);
      expect(Symbol().place.callCount).to.equal(3);
      expect(() => { sys.draw(app); }).to.not.increase(Symbol().place, "callCount");
      expect(grid.getTilesByComponent("!plant")).to.have.lengthOf(3);
    });

    it("should remove plant symbols for tiles that no longer have vegetation", () => {
      const { Symbol } = app.paper;
      sys.draw(app); // Create the vegeation graphics

      // Remove plant from one of the tiles
      let tile = grid.getTilesByComponent("plant")[0];
      tile.delete("plant");

      // Expect that the graphic was removed from both the scene and the tile
      let deleteSpy = spy(tile, "delete");
      sys.draw(app);
      deleteSpy.restore();
      expect(Symbol().place().remove.calledOnce).to.be.true;
      expect(deleteSpy.calledWith("!plant")).to.be.true;
      expect(tile.get("!plant")).to.be.undefined;
    });
  });
});