
var fs = require('fs');

var LOGGER = require('log4js').getLogger('file.js');

var File = function(filePath, length, offset, cb) {
  this.path = filePath;
  this.length = length;
  this.offset = offset || 0;

  var self = this;
  fs.exists(filePath, function(exists) {
    if (exists) {
      var flag = 'r+';
    } else {
      flag = 'w+';
    }
    fs.open(filePath, flag, 0666, function(err, fd) {
      self.fd = fd;
      cb(err);
    });
  });
};

File.prototype.contains = function(offset, length) {
  var fileEnd = this.offset + this.length;
  var pieceEnd = offset + length;

  if (offset >= this.offset
      && pieceEnd <= fileEnd) {
    return File.FULL;
  }
  if ((offset >= this.offset && offset <= fileEnd)
       || (pieceEnd >= offset && pieceEnd <= fileEnd)) {
    return File.PARTIAL;
  }
  return File.NONE;
};

File.prototype.read = function(offset, length, callback) {
  var match = this.contains(offset, length);
  if (match === File.PARTIAL || match === File.FULL) {
    var bounds = calculateBounds(this, offset, length);
    var data = new Buffer(bounds.dataLength);
    fs.read(this.fd, data, 0, data.length, bounds.offset, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(match, data);
      }
    });
  } else {
    callback(match);
  }
};

File.prototype.write = function(offset, data, callback) {
  var match = this.contains(offset, data.length);
  if (match === File.PARTIAL || match === File.FULL) {
    var bounds = calculateBounds(this, offset, data.length);
    fs.write(this.fd, data, 0, data.length, bounds.offset, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(match);
      }
    });
  } else {
    callback(match);
  }
};

function calculateBounds(self, offset, length) {
  var dataOffset = 0;
  var dataLength = length;
  if (offset < self.offset) {
    dataOffset = self.offset - offset;
    dataLength -= dataOffset;
  }
  var pieceEnd = offset + dataLength;
  var fileEnd = self.offset + self.length;
  if (pieceEnd > fileEnd) {
    dataLength -= (pieceEnd - fileEnd);
  }
  var o = offset <= self.offset ? 0 : offset - self.offset;
  return {
    dataOffset: dataOffset,
    dataLength: dataLength,
    offset: o
  };
}

File.PARTIAL = 'partial';
File.FULL = 'full';
File.NONE = 'none';

module.exports = File;
