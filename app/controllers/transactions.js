'use strict';

/**
 * Module dependencies.
 */
var Transaction = require('../models/Transaction');
var Block       = require('../models/Block');
var Address     = require('../models/Address');
var async       = require('async');
var common      = require('./common');


/**
 * Find transaction by hash ...
 */
exports.transaction = function(req, res, next, txid) {
  Transaction.fromIdWithInfo(txid, function(err, tx) {
    if (err || ! tx)
      return common.handleErrors(err, res);
    else {
      req.transaction = tx.info;
      return next();
    }
  });
};


/**
 * Show transaction
 */
exports.show = function(req, res) {

  if (req.transaction) {
    res.jsonp(req.transaction);
  }
};


var getTransaction = function(txid, cb) {
  Transaction.fromIdWithInfo(txid, function(err, tx) {
    if (err) {
      console.log(err);
      return cb(err);
    }
    return cb(null, tx.info);
  });
};


/**
 * List of transaction
 */
exports.list = function(req, res, next) {
  var bId = req.query.block;
  var addrStr = req.query.address;
  var page = req.query.pageNum;
  var pageLength = 20;
  var pagesTotal = 1;
  var txLength;
  var txs;

  if (bId) {
    Block.fromHashWithInfo(bId, function(err, block) {
      if (err && !block) {
        console.log(err);
        res.status(404).send('Not found');
        return next();
      }

      txLength = block.info.tx.length;

      if (page) {
        var spliceInit = page * pageLength;
        txs = block.info.tx.splice(spliceInit, pageLength);
        pagesTotal = Math.ceil(txLength / pageLength);
      }
      else {
        txs = block.info.tx;
      }

      async.mapSeries(txs, getTransaction,
        function(err, results) {
          res.jsonp({
            pagesTotal: pagesTotal,
            txs: results
          });
        });
    });
  }
  else if (addrStr) {
    var a = Address.new(addrStr);

    a.update(function(err) {
      if (err && !a.totalReceivedSat) {
        console.log(err);
        res.status(404).send('Invalid address');
        return next();
      }

      txLength = a.transactions.length;

      if (page) {
        var spliceInit = page * pageLength;
        txs = a.transactions.splice(spliceInit, pageLength);
        pagesTotal = Math.ceil(txLength / pageLength);
      }
      else {
        txs = a.transactions;
      }

      async.mapSeries(txs, getTransaction,
        function(err, results) {
          res.jsonp({
            pagesTotal: pagesTotal,
            txs: results
          });
        });
    });
  }

};
