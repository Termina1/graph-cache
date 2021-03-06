const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const {
  testSign,
  testGraph,
  verifyGraph,
  load4Graph,
  load3Graph4,
  load3Graph,
  load2Graph,
  getName,
  loadFiles,
  compareGraphs,
  loadCyclicGraph,
  loadCyclicGraphChange,
  loadCyclicGraphSimple,
} = require('../utils/test_utils');
const { loadFile } = require('../../lib/file_process');
const fs = require('fs');
const path = require('path');
const { json } = require('graphlib');

chai.use(chaiAsPromised);

const { updateGraph } = require('../../lib/update_graph');

describe('updateGraph', () => {
  it('does not change graph, if nothing was changed', () =>
    load2Graph(true).then(([g, files, names]) =>
      updateGraph(g, testSign, () => load2Graph(), '', getName(1))
        .then(nwg =>
          verifyGraph(nwg, [
            [names[0], testSign(files[0])],
            [names[1], testSign(files[1])],
          ], [
            { v: names[1], w: names[0] },
          ]
        )
      )
    )
  );

  it('changes node signature if it changed', () =>
    load2Graph(true).then(([g, files, names]) =>
      updateGraph(g, testSign, () =>
        load2Graph().then(ng => {
          ng.setNode(names[1], testSign(files[1]) + 1);
          return ng;
        })
      , '', getName(1))
        .then(nwg =>
          verifyGraph(nwg, [
            [names[0], testSign(files[0])],
            [names[1], testSign(files[1]) + 1],
          ], [
            { v: names[1], w: names[0] },
          ]
        )
      )
    )
  );

  it('adds single node to empty graph', () =>
    loadFiles(1).then(([[file, name]]) => {
      const g = testGraph();
      return updateGraph(g, testSign, () => {
        const nwg = testGraph();
        nwg.setNode(name, testSign(file));
        return Promise.resolve(nwg);
      }, file, getName(1)).then((nwg) => verifyGraph(nwg, [
        [name, testSign(file)],
      ], []));
    })
  );

  it('adds new node if it appeared in graph', () =>
    loadFiles(4).then(([[file4, name4]]) =>
      load3Graph(true).then(([g, files, names]) =>
        updateGraph(g, testSign, () => load3Graph4(), '', getName(1))
          .then(nwg =>
            verifyGraph(nwg, [
              [names[0], testSign(files[0])],
              [names[1], testSign(files[1])],
              [names[2], testSign(files[2])],
              [name4, testSign(file4)],
            ], [
              { v: names[1], w: names[0] },
              { v: names[1], w: names[2] },
              { v: name4, w: names[0] },
            ]
          )
        )
      )
    )
  );

  it('removes old node and edges if dep was remove', () =>
    load4Graph(true).then(([g, files, names]) =>
      updateGraph(g, testSign, () => load2Graph(), '', getName(1))
        .then(nwg =>
          verifyGraph(nwg, [
            [names[0], testSign(files[0])],
            [names[1], testSign(files[1])],
            [names[2], testSign(files[2])],
          ], [
            { v: names[1], w: names[0] },
            { v: names[1], w: names[2] },
          ]
        )
      )
    )
  );

  it('changes graph structure if dependency graph changed', () =>
    load3Graph(true).then(([g, files, names]) => {
      g.removeEdge(getName(2), getName(3));
      g.setEdge(getName(3), getName(1));
      return updateGraph(g, testSign, () => load3Graph().then(nwg => {
        nwg.removeEdge(getName(2), getName(3));
        nwg.setEdge(getName(3), getName(2));
        return nwg;
      }), '', getName(1)).then(nwg =>
          verifyGraph(nwg, [
            [names[0], testSign(files[0])],
            [names[1], testSign(files[1])],
            [names[2], testSign(files[2])],
          ], [
            { v: names[1], w: names[0] },
            { v: names[2], w: names[1] },
          ]
        )
      );
    })
  );

  it('if subgraph is empty, will remove only leaf', () =>
    load3Graph(true).then(([g, files, names]) =>
      updateGraph(g, testSign, () => Promise.resolve(testGraph()), '', getName(1))
        .then(nwg =>
          verifyGraph(nwg, [
            [names[1], testSign(files[1])],
            [names[2], testSign(files[2])],
          ], [
            { v: names[1], w: names[2] },
          ]
        )
      )
    )
  );

  it('handles cyclic graphs', () =>
    load2Graph().then(g =>
      loadCyclicGraphSimple().then(gg => {
        return updateGraph(g, testSign, loadCyclicGraphSimple.bind(null, false), '', getName(1))
          .then(nwg => compareGraphs(nwg, gg))
      })
    )
  );

  it('handles complex cyclic graphs', () =>
    loadCyclicGraph().then(g =>
      loadCyclicGraphChange().then(gg => {
        return updateGraph(g, testSign, loadCyclicGraphChange.bind(null, false), '', getName(1))
          .then(nwg => compareGraphs(nwg, gg))
      })
    )
  );

  it('if subgraph is empty, will remove leaf and nodes with no connection', () =>
    load2Graph(true).then(([g]) =>
      updateGraph(g, testSign, () => Promise.resolve(testGraph()), '', getName(1))
        .then(nwg => verifyGraph(nwg, [], []))
    )
  );

  const fixturesDir = 'tests/fixtures/cases';

  fs.readdirSync(fixturesDir).forEach(caseName => {
    it(`should ${caseName.replace(/-/ig, ' ')}`, () => {
      const fixtureDir = path.join(fixturesDir, caseName);
      const source = path.join(fixtureDir, 'graph.json');
      const subgraph = path.join(fixtureDir, 'subgraph.json');
      const expected = path.join(fixtureDir, 'expected.json');
      return Promise.all([source, subgraph, expected].map((f) => loadFile(f)))
        .then(([[sf], [sbf], [ef]]) => {
          const g = json.read(JSON.parse(sf));
          const sg = json.read(JSON.parse(sbf));
          const eg = json.read(JSON.parse(ef));

          return updateGraph(g, testSign, () => Promise.resolve(sg), '', 'start')
            .then(nwg => compareGraphs(eg, nwg));
        });
    });
  });
});
