var assert = require('assert');
var should = require('should')
var conversion = require('../lib/conversion');

describe('Conversion', function(){
	describe('buildKeyMap', function(){
		it('can handle an empty list.', function(){
			conversion.buildKeyMap([],0).should.be.empty;
		})
	});

	describe('translateModifiers', function(){
		it('can handle the super modifier.', function(){
			conversion.translateModifiers('super').should.be.equal(64);
		})
	});
});
