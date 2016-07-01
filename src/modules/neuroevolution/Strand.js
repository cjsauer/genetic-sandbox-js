import _ from "lodash";
import Serializable from "../util/Serializable";
import NodeGene from "./NodeGene";
import ConnectionGene from "./ConnectionGene";

/**
 * Genetic representation of a neural network
 * @extends Serializable
 * @see {NodeGene}
 * @see {ConnectionGene}
 */
class Strand extends Serializable {
  /**
   * Constructs a new Strand representing a fully connected neural network with
   * the given number of input/output neurons, zero hidden neurons, and
   * random weight values
   * @example
   * // Represents a neural network with 4 input neurons, 5 output neurons,
   * // and all connection genes enabled.
   * const strand1 = new Strand(4, 5, true, random);
   * // Represents a neural network with 2 input neurons, 4 output neurons,
   * // and all connection genes disabled.
   * const strand2 = new Strand(2, 4, false, random);
   * @param {number} inputCount - number of input neuron genes
   * @param {number} outputCount - number of output neuron genes
   * @param {boolean} enabled - whether all connection genes are initially
   * enabled (true), or disabled (false)
   * @param {Object} random - an instance of a random-js instance
   */
  constructor(inputCount, outputCount, enabled, random) {
    super("strand");

    /**
     * The list of node genes describing neurons
     * @type {NodeGene[]}
     */
    this.nodeGenes = [];

    /**
     * The list of connection genes describing connections between neurons
     * @type {ConnectionGene[]}
     */
    this.connectionGenes = [];

    /**
     * The ID to use for the next node gene
     * @private
     * @type {number}
     */
    this._nextNodeGeneID = 1;

    if (arguments.length === 0) return;

    let inputNodeGenes = [];
    let outputNodeGenes = [];
    let connectionGenes = [];

    // Create the input node genes
    for (let i = 0; i < inputCount; i++) {
      inputNodeGenes.push(new NodeGene(this._nextNodeGeneID++, "input"));
    }

    // Create the output node genes
    for (let i = 0; i < outputCount; i++) {
      outputNodeGenes.push(new NodeGene(this._nextNodeGeneID++, "output"));
    }

    // Create a connection gene for every input/output combination
    inputNodeGenes.forEach((inputNodeGene) => {
      outputNodeGenes.forEach((outputNodeGene) => {
        let weight = random.real(0, 1, true);
        let connGene = new ConnectionGene(inputNodeGene.id, outputNodeGene.id, weight, enabled);
        connectionGenes.push(connGene);
      });
    });

    this.nodeGenes = inputNodeGenes.concat(outputNodeGenes);
    this.connectionGenes = connectionGenes;
  }

  /**
   * Returns the count of input node genes in this strand
   * @returns {number} input node gene count
   */
  get inputNodeGeneCount() {
    const isInputNodeGene = (gene) => gene.type === "input";
    return this.nodeGenes.filter(isInputNodeGene).length;
  }

  /**
   * Returns the count of output node genes in this strand
   * @returns {number} output node gene count
   */
  get outputNodeGeneCount() {
    const isOutputNodeGene = (gene) => gene.type === "output";
    return this.nodeGenes.filter(isOutputNodeGene).length;
  }

  /**
   * Returns the count of hidden node genes in this strand
   * @returns {number} hidden node gene count
   */
  get hiddenNodeGeneCount() {
    const isHiddenNodeGene = (gene) => gene.type === "hidden";
    return this.nodeGenes.filter(isHiddenNodeGene).length;
  }

  /**
   * Randomly perturbs this strand's connection gene weights, possibly
   * replacing the weight with a new value completely. Chances are NOT
   * codependent.
   * @param {number} perturbChance - chance that each weight has of being mutated
   * @param {number} perturbAmplitude - maximum change in weight possible
   * @param {number} newValueChance - chance that a weight will be completely
   * replaced by a new value
   * @param {Object} random - random-js generator instance
   */
  mutateWeights(perturbChance, perturbAmplitude, newValueChance, random) {
    this.connectionGenes.forEach((gene) => {
      if (random.bool(perturbChance)) {
        let delta = perturbAmplitude * random.real(0, 1) * (random.bool(0.5) ? 1 : -1);
        gene.weight += delta;
      }

      if (random.bool(newValueChance)) {
        gene.weight = random.real(0, 1);
      }
    });
  }

  /**
   * Splits the given connection gene with a new node gene. The original
   * connection is disabled and two new connection genes are added to the
   * strand. The new connection leading into the new node receives a weight of
   * 1, and the new connection leading out of the new node receives the same
   * weight as the original connection.
   * @private
   * @param {ConnectionGene} connectionGene - connection gene to split
   */
  _splitConnectionWithNode(connectionGene) {
    const nodeGene = new NodeGene(this._nextNodeGeneID++, "hidden");
    const incomingConnection = new ConnectionGene(connectionGene.in, nodeGene.id, 1, true);
    const outgoingConnection = new ConnectionGene(nodeGene.id, connectionGene.out, connectionGene.weight, true);
    connectionGene.enabled = false;
    this.nodeGenes.push(nodeGene);
    this.connectionGenes.push(incomingConnection);
    this.connectionGenes.push(outgoingConnection);
  }

  /**
   * Chooses a connection gene at random and splits it with a new node gene
   * @param {Object} random - random-js generator instance
   */
  addRandomNodeGene(random) {
    const connectionToSplit = random.pick(this.connectionGenes);
    this._splitConnectionWithNode(connectionToSplit);
  }

  /**
   * Determines if two node genes are connected
   * @private
   * @param {NodeGene} sourceNode - source node of the potential connection
   * @param {NodeGene} destNode - destination node of the potential connection
   * @returns {boolean} true if the two node genes are already connected, false
   * otherwise
   */
  _areConnected(sourceNode, destNode) {
    return this.connectionGenes.some((gene) => {
      return (gene.in === sourceNode.id && gene.out === destNode.id);
    });
  }

  /**
   * Determines if two node genes are capable of being connected
   * @private
   * @param {NodeGene} sourceNode - the source node of the potential connection
   * @param {NodeGene} destNode - the destination node of the potential
   * connection
   * @returns {boolean} true if the given node genes are able to connect, false
   * otherwise
   */
  _canConnect(sourceNode, destNode) {
    return sourceNode.type !== "output" &&
           destNode.type !== "input" &&
           !this._areConnected(sourceNode, destNode);
  }

  /**
   * Connects the two given node genes with a new connection gene
   * @private
   * @param {NodeGene} sourceNode - the source node of the new connection
   * @param {NodeGene} destNode - the destination node of the new connection
   * @param {ConnectionGene} the new connection gene, or null if that connection
   * is not valid
   */
  _connect(sourceNode, destNode, random) {
    let connectionGene = null;
    if (this._canConnect(sourceNode, destNode)) {
      connectionGene = new ConnectionGene(sourceNode.id, destNode.id, random.real(0, 1), true);
      this.connectionGenes.push(connectionGene);
    }
    return connectionGene;
  }

  /**
   * Attempts to add a random connection gene to the genome, failing after
   * the given number of iterations
   * @param {number} iterations - number of times to randomly try selecting two
   * node genes to connect
   * @param {Object} random - random-js generator instance
   * @returns {ConnectionGene} the added connection gene, or null if no gene could
   * be added
   */
  addRandomConnectionGene(iterations, random) {
    let connectionGene = null;
    for (let attempts = 0; attempts < iterations; attempts++) {
      // Randomly select two nodes...
      let sourceNode = random.pick(this.nodeGenes);
      let destNode = random.pick(this.nodeGenes);

      // ...and attempt to connect them
      connectionGene = this._connect(sourceNode, destNode, random);
      if (connectionGene !== null) break;
    }
    return connectionGene;
  }

  /**
   * Returns the matching connection genes between this and the given strand.
   * Connection genes are considered matching if they have the same innovation
   * number.
   * @private
   * @param {Strand} otherStrand - the strand to compare this one against
   * @returns {ConnectionGene[]} array of matching connection genes
   */
  _matching(otherStrand) {
    return _.intersectionBy(this.connectionGenes, otherStrand.connectionGenes, (gene) => {
      return gene.innovationNumber;
    });
  }

  /**
   * Returns the disjoint connection genes between this and the given strand.
   * Connection genes are considered disjoint if they are not matching in the
   * middle of the strands.
   * @private
   * @param {Strand} otherStrand - the strand to compare this one against
   * @returns {ConnectionGene[]} array of disjoint connection genes
   */
  _disjoint(otherStrand) {
    const result = [];
    // Only consider non-matching genes
    let matching = this._matching(otherStrand);
    let candidates = _.without(this.connectionGenes, ...matching);
    let others = _.without(otherStrand.connectionGenes, ...matching);

    // Test whether the given candidate has an innovation number that's less
    // than any gene's innovation number in the other strand
    candidates.forEach((candidate) => {
      if (others.some((gene) => { return gene.innovationNumber > candidate.innovationNumber; })) {
        result.push(candidate);
      }
    });
    return result;
  }

  /**
   * Returns the excess connection genes between this and the given strand.
   * Connection genes are considered excess if they are not matching at the
   * end of the strand.
   * @private
   * @param {Strand} otherStrand - the strand to compare this one against
   * @returns {ConnectionGene[]} array of excess connection genes
   */
  _excess(otherStrand) {
    const result = [];
    // Only consider non-matching genes
    let matching = this._matching(otherStrand);
    let candidates = _.without(this.connectionGenes, ...matching);
    let others = _.without(otherStrand.connectionGenes, ...matching);

    // Test whether the given candidate has an innovation number that's greater
    // than every gene's innovation number in the other strand
    candidates.forEach((candidate) => {
      if (others.every((gene) => { return gene.innovationNumber < candidate.innovationNumber; })) {
        result.push(candidate);
      }
    });
    return result;
  }

  /**
   * Crosses this strand over with the given one. Matching genes are inherited
   * randomly from both parents, whereas disjoint and excess genes are inherited
   * only from the more fit parent. The more fit parent is assumed to be `this`
   * strand unless the equalFitness flag is set to true. In that case ALL
   * disjoint and excess genes are inherited. Genes that are disabled in either
   * parent have the given chance of also being disabled in the offspring.
   * @param {Strand} otherStrand - the strand to crossover with this one
   * @param {number} disabledChance - the chance that a gene has of being
   * disabled if it is disabled in either parent
   * @param {boolean} equalFitness - if set to true, all excess and disjoint
   * genes are inherited from both parents, otherwise only the excess and
   * disjoint genes from `this` parent will be inherited
   * @param {Object} random - a random-js generator instance
   */
  crossover(otherStrand, disabledChance, equalFitness, random) {
    let offspring = new Strand(); // Create an empty strand to fill up

    // Randomly inherit matching genes
    let myMatchingGenes = this._matching(otherStrand).sort((a, b) => a.innovationNumber - b.innovationNumber);
    let otherMatchingGenes = otherStrand._matching(this).sort((a, b) => a.innovationNumber - b.innovationNumber);
    for (let i = 0; i < myMatchingGenes.length; i++) {
      let geneToInherit = random.bool(0.5) ? myMatchingGenes[i] : otherMatchingGenes[i];
      let gene = geneToInherit.clone();
      gene.enabled = true;
      if ((!myMatchingGenes[i].enabled || !otherMatchingGenes[i].enabled) && random.bool(disabledChance)) {
        gene.enabled = false;
      }
      offspring.connectionGenes.push(gene);
    }

    // Inherit either `this` parent's excess and disjoint genes, or both parents'
    // excess and disjoint genes if the equalFitness flag is set
    let inheritedExcessAndDisjointGenes = [];
    let myExcess = this._excess(otherStrand);
    let myDisjoint = this._disjoint(otherStrand);
    inheritedExcessAndDisjointGenes = myExcess.concat(myDisjoint);
    if (equalFitness) {
      let otherExcess = otherStrand._excess(this);
      let otherDisjoint = otherStrand._disjoint(this);
      inheritedExcessAndDisjointGenes = inheritedExcessAndDisjointGenes.concat(otherExcess.concat(otherDisjoint));
    }
    offspring.connectionGenes = offspring.connectionGenes.concat(inheritedExcessAndDisjointGenes);

    // Inherit all the necessary node genes
    let possibleNodeGenes = _.uniqBy(this.nodeGenes.concat(otherStrand.nodeGenes), (gene) => gene.id);
    offspring.nodeGenes = possibleNodeGenes.filter((nodeGene) => {
      // Remove all node genes that aren't part of a connection
      return offspring.connectionGenes.some((connGene) => {
        return connGene.in === nodeGene.id || connGene.out === nodeGene.id;
      });
    }).map((gene) => gene.clone());
    offspring._nextNodeGeneID = offspring.nodeGenes.length + 1;

    return offspring;
  }

  /**
   * Computes the compatibility distance between two strands
   * @param {Strand} otherStrand - the strand to compare this one against
   * @param {number} excessCoefficient - the importance placed on the number
   * of excess genes in determining compatibility
   * @param {number} disjointCoefficient - the importance placed on the number
   * of disjoint genes in determining compatibility
   * @param {number} weightCoefficient - the importance placed on differences
   * in weights between matching connection genes in determining compatibility
   * @returns {number} the computed compatibility distance measure
   */
  compatibilityDistance(otherStrand, excessCoefficient, disjointCoefficient, weightCoefficient) {
    // Determine the number of genes in the larger genome, normalized to 1 if
    // both genomes are "small" (less than 20 genes)
    let myLength = this.connectionGenes.length;
    let otherLength = otherStrand.connectionGenes.length;
    let N = myLength >= otherLength ? myLength : otherLength;
    if (N < 20) N = 1;

    // Compute matching, disjoint, and excess gene counts
    let myMatchingGenes = this._matching(otherStrand);
    let otherMatchingGenes = otherStrand._matching(this);
    let myDisjoints = this._disjoint(otherStrand);
    let otherDisjoints = otherStrand._disjoint(this);
    let totalDisjoints = myDisjoints.length + otherDisjoints.length;
    let myExcess = this._excess(otherStrand);
    let otherExcess = otherStrand._excess(this);
    let totalExcess = myExcess.length + otherExcess.length;

    // Compute the average weight difference between matching genes
    let totalWeightDifference = 0;
    for (let i = 0; i < myMatchingGenes.length; i++) {
      totalWeightDifference += Math.abs(myMatchingGenes[i].weight - otherMatchingGenes[i].weight);
    }
    let averageWeightDifference = totalWeightDifference / myMatchingGenes.length;

    // Compute the final compatibility distance
    return (excessCoefficient * totalExcess / N) + (disjointCoefficient * totalDisjoints / N) + (weightCoefficient * averageWeightDifference);
  }

  /**
   * Makes a complete, deep copy of this strand
   * @returns {Strand} the cloned strand
   */
  clone() {
    let strand = new Strand();
    strand._nextNodeGeneID = this._nextNodeGeneID;
    this.nodeGenes.forEach((gene) => {
      strand.nodeGenes.push(new NodeGene(gene.id, gene.type));
    });
    this.connectionGenes.forEach((gene) => {
      strand.connectionGenes.push(new ConnectionGene(gene.in, gene.out, gene.weight, gene.enabled));
    });
    return strand;
  }
}

Serializable.register(Strand);

export default Strand;
