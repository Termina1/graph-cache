'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var diff = require('lodash.differenceby');

function ensureConnectivity(g, nwg, leafs, processed) {
  var nextCheck = [];
  leafs.forEach(function (leaf) {
    processed[leaf] = true;
    nextCheck = nextCheck.concat(g.predecessors(leaf) || []).filter(function (el) {
      return !processed[leaf];
    });

    if (!nwg.node(leaf) && g.successors(leaf).length === 0) {
      g.removeNode(leaf);
    }
  });

  if (nextCheck.length === 0) {
    return g;
  }

  return ensureConnectivity(g, nwg, nextCheck, processed);
}

function updateEdges(g, nwg, leaf) {
  var oldEdges = g.inEdges(leaf) || [];
  var newEdges = nwg.inEdges(leaf) || [];
  var removedEdges = diff(oldEdges, newEdges, function (el) {
    return el.v + '__' + el.w;
  });
  removedEdges.forEach(function (edge) {
    g.removeEdge(edge.v, edge.w);
  });
  newEdges.forEach(function (edge) {
    g.setEdge(edge.v, edge.w);
  });
}

function walkTogether(nwg, g, leafs, walked) {
  var nextLeafs = [];
  leafs.forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        leaf = _ref2[0],
        parent = _ref2[1];

    var curPred = nwg.predecessors(leaf) || [];
    var oldPred = g.predecessors(leaf) || [];
    walked[leaf] = true;
    nextLeafs = nextLeafs.concat(curPred.map(function (el) {
      return [el, leaf];
    }));
    if (!nwg.node(leaf)) {
      g.removeNode(leaf);
    } else if (!g.node(leaf)) {
      g.setNode(leaf, nwg.node(leaf));
      if (parent !== null) {
        g.setEdge(leaf, parent);
      }
      updateEdges(g, nwg, leaf);
    } else if (nwg.node(leaf) !== g.node(leaf)) {
      g.setNode(leaf, nwg.node(leaf));
      updateEdges(g, nwg, leaf);
    } else {
      updateEdges(g, nwg, leaf);
    }
    var diffPred = diff(oldPred, curPred);
    if (diffPred.length > 0) {
      ensureConnectivity(g, nwg, diffPred, {});
    }
  });

  nextLeafs = nextLeafs.filter(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 1),
        el = _ref4[0];

    return !walked[el];
  });

  if (nextLeafs.length === 0) {
    return g;
  }
  return walkTogether(nwg, g, nextLeafs, walked);
}

function updateGraph(g, sign, parse, file, filename) {
  return parse(sign, file, filename).then(function (nwg) {
    return walkTogether(nwg, g, [[filename, null]], {});
  });
}

module.exports = {
  updateGraph: updateGraph
};