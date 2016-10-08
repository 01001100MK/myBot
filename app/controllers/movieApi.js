
exports.searchMovie = function(sender, movie) {
    request
      .get("https://api.themoviedb.org/3/search/movie?api_key=81d7640dffed48055b1803be5b452893&query=" + movie)
      .set('Content-Type', 'application/json')
      .accept('application/json')
      .end(function(err, res) {
          if (err) {
              console.error(err);
          } else {
              var movie = res.body.results[0];

              sendTextMessage(sender, movie.title);
              sendTextMessage(sender, movie.overview);
              sendTextMessage(sender, movie.release_date);
              sendTextMessage(sender, movie.vote_average);
              sendTextMessage(sender, movie.id);
          }
      });
};
