var assert = require('assert');
var should = require('should')
var conversion = require('../lib/conversion');

describe('Conversion', function(){
	describe('buildKeyMap', function(){
		it('can handle an empty list.', function(){
			conversion.buildKeyMap([],0).should.be.empty;
		}),
		it('can handle a simple list.', function(){
			conversion.buildKeyMap([[1,2],[3,4]],1).should.containDeep({'1': 1, '2': 1, '3': 2, '4': 2});
		}),
		it('can handle a zero as minimum value.', function(){
			conversion.buildKeyMap([[1,2],[3,4]],0).should.containDeep({'1': 0, '2': 0, '3': 1, '4': 1});
		}),
		it('can handle a large key map.', function(){
			conversion.buildKeyMap([[11111,22222,33333,44444,55555],[66666,77777,88888,99999]],1000).should.containDeep(
				{'11111': 1000,
				'22222': 1000,
				'33333': 1000,
				'44444': 1000,
				'55555': 1000,
				'66666': 1001,
				'77777': 1001,
				'88888': 1001,
				'99999': 1001});
		})
	});

	describe('translateModifiers', function(){
		it('can handle an unexpected modifier.', function(){
			conversion.translateModifiers('foo').should.be.zero;
		}),
		it('can handle the super modifier.', function(){
			conversion.translateModifiers('super').should.be.equal(64);
		})
	});
});
