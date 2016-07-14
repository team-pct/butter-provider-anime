'use strict';

var _ = require('lodash');
var Generic = require('butter-provider');
var inherits = require('util').inherits;
var Q = require('q');
var querystring = require('querystring');
var request = require('request');
var sanitize = require('butter-sanitize');

var AnimeApi = function (args) {
  var that = this;

  AnimeApi.super_.call(this);

  if (args.apiURL)
    this.apiURL = args.apiURL.split(',');
  };

inherits(AnimeApi, Generic);

AnimeApi.prototype.config = {
  name: 'AnimeApi',
  uniqueId: 'mal_id',
  tabName: 'AnimeApi',
  type: 'anime',
  metadata: 'trakttv:anime-metadata'
};

function formatFetch(animes) {
  var results = _.map(animes, function (anime) {
    return {
      images: anime.images,
      mal_id: anime._id,
      haru_id: anime._id,
      tvdb_id: 'mal-' + anime._id,
      imdb_id: anime._id,
      slug: anime.slug,
      title: anime.title,
      year: anime.year,
      type: anime.type,
      item_data: anime.type,
      rating: anime.rating
    };
  });

  return {results: sanitize(results), hasMore: true};
};

function formatDetail(anime) {
  var result = {
    mal_id: anime._id,
    haru_id: anime._id,
    tvdb_id: 'mal-' + anime._id,
    imdb_id: anime._id,
    slug: anime.slug,
    title: anime.title,
    item_data: anime.type,
    country: 'Japan',
    genre: anime.genres,
    genres: anime.genres,
    num_seasons: 1,
    runtime: anime.runtime,
    status: anime.status,
    synopsis: anime.synopsis,
    network: [], //FIXME
    rating: anime.rating,
    images: anime.images,
    year: anime.year,
    type: anime.type
  };

  if (anime.type === 'show') {
    result = _.extend(result, {episodes: anime.episodes});
  } else {
    // ret = _.extend(ret, {
    //   cover: img,
    //   rating: item.score,
    //   subtitle: undefined,
    //   torrents: movieTorrents(item.id, item.episodes)
    // });
  }

  return sanitize(result);
};

function get(index, url, that) {
  var deferred = Q.defer();

  var options = {
    url: url,
    json: true
  };

  var req = _.extend({}, that.apiURL[index], options);
  console.info('Request to AnimeApi', req.url);
  request(req, function (err, res, data) {
    if (err || res.statusCode >= 400) {
      console.warn('AnimeAPI endpoint \'%s\' failed.', that.apiURL[index]);
      if (index + 1 >= that.apiURL.length) {
        return deferred.reject(err || 'Status Code is above 400');
      } else {
        return getFetch(index + 1, url);
      }
    } else if (!data || data.error) {
      err = data ? data.status_message : 'No data returned';
      console.error('API error:', err);
      return deferred.reject(err);
    } else {
      return deferred.resolve(data);
    }
  });

  return deferred.promise;
};

AnimeApi.prototype.extractIds = function (items) {
  return _.map(items.results, 'mal_id');
};

AnimeApi.prototype.fetch = function (filters) {
  var that = this;

  var params = {};
  params.sort = 'seeds';
  params.limit = '50';

  if (filters.keywords) {
    params.keywords = filters.keywords.replace(/\s/g, '% ');
  }

  if (filters.genre) {
    params.genre = filters.genre;
  }

  if (filters.order) {
    params.order = filters.order;
  }

  if (filters.sorter && filters.sorter !== 'popularity') {
    params.sort = filters.sorter;
  }

  var index = 0;
  var url = that.apiURL[index] + 'animes/' + filters.page + '?' + querystring.stringify(params).replace(/%25%20/g, '%20');
  return get(index, url, that).then(formatFetch);
};

AnimeApi.prototype.detail = function (torrent_id, old_data, debug) {
  var that = this;

  var index = 0;
  var url = that.apiURL[index] + "anime/" + torrent_id;
  return get(index, url, that).then(formatDetail);
};

module.exports = AnimeApi;
