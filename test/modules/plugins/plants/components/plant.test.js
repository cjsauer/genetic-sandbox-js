import Plant from "../../../../../src/modules/plugins/plants/components/Plant";
import Component from "../../../../../src/modules/plugins/Component";
import { expect } from "chai";

describe("Plant", () => {
  it("should register its constructor with Component", () => {
    expect(Component._constructors["Plant"]).to.eql(Plant);
  });

  it("should contain energy", () => {
    const plant = new Plant(10);
    expect(plant.energy).to.equal(10);
  });

  it("should default to zero energy", () => {
    const plant = new Plant();
    expect(plant.energy).to.equal(0);
  });
});