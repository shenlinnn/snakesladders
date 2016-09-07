// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");
Snakes = new Mongo.Collection("snake");
Ladders = new Mongo.Collection("Ladder"); 

// get random step for each roll
function getRandomRoll() {
    return Math.floor(Math.random() * 6) + 1;
}

// get id of player, used in the click .roll function
function getId(item){
  return item._id;
}


if (Meteor.isClient) {

  Template.snakenladder.helpers({
    players: function () {
      return Players.find();
    },
    selectedName: function () {
      var player = Players.findOne({turn:true});
      return player && player.name;
    }
  });

  Template.snakenladder.events({
    // function for clicking the roll button
    'click .roll': function () {
      // update the player score
      var currentId = Players.findOne({turn:true})._id;
      Players.update(currentId, {$set: {previous: Players.findOne({_id:currentId}).score}});
      var roll = getRandomRoll();
      Players.update(currentId, {$inc: {score: roll}});
      var newscore = Players.findOne({_id: currentId}).score;

      // if the new score has a snake, then moves backward
      if ( Snakes.findOne({snake: newscore}) !== undefined ){
        newscore = Snakes.findOne({ snake: newscore }).back;
        Players.update(currentId, {$set: {score: newscore}});
      };

      // if the new score has a ladder, then moves forward
      if ( Ladders.findOne({ladder: newscore}) !== undefined ){
        newscore = Ladders.findOne({ ladder: newscore }).up;
        Players.update(currentId, {$set: {score: newscore}});
      };

      // if two players have the same score, then the one comes later moves to 0
      if ( Players.find({score: newscore}).count() > 1 ){
        newscore = 0;
        Players.update(currentId, {$set: {score: newscore}});
      }

      // if the new score reaches 100 (or beyond), its database is updated
      if ( newscore >= 100 ) {
        var winner =  Players.findOne({ _id: currentId }).name;
        Players.update(currentId, {$set: {score: 100}});
        Players.update(currentId, {$set: {success: true}});
        var success_count = Players.find({success: true}).count();
        Players.update(currentId, {$set: {rank: success_count}});

        $(".subtitle")[0].innerHTML = "Congratulations!";
        $('.selected .winner')[0].style.display = 'inline';
      }

      // update the message to indicate steps movement
      var currentPlayer = Players.findOne({_id: currentId});
      var diff = newscore - (currentPlayer.previous + roll);
      var selectedName = currentPlayer.name;
      if (diff < 0) {
        $(".currentPlayer")[0].innerHTML = selectedName + " moves " + roll.toString() + " steps forward and moves " + (-diff).toString() + " steps backward";
      } else if (diff > 0) {
        $(".currentPlayer")[0].innerHTML = selectedName + " moves " + roll.toString() + " steps forward and moves " + diff.toString() + " steps forward";
      } else {
        $(".currentPlayer")[0].innerHTML = selectedName + " moves " + roll.toString() + " steps forward";
      }

      if ( newscore >= 100 ) {
        $(".currentPlayer")[0].innerHTML += " and reaches 100";
      }

      // find the next player
      Players.update(currentId, {$set: {turn: false}});
      var allPlayers = Players.find().fetch();
      var allId= allPlayers.map(getId);
      var position = allId.indexOf(currentId);
      for (i = 1; i < 5; i++){
        var newposition = (position+i) % 4;
        if (allPlayers[newposition].success === false) {
          break;
        }
      }

      // if all players reach 100, the roll button will be disabled
      // else set the selectedPlayer to the next player found above
      if (Players.find({success: true}).count() === 4){
        $('.roll')[0].disabled = true;
      } else {
        Players.update(allPlayers[newposition]._id, {$set: {turn: true}});
      }
    }

  });


  Template.snakenladder.events({
    // function trigger when clicking on restart button
    'click .restart':function() {
      // reset all player attributes
      for (i = 0; i < 4; i++){
        var allPlayers = Players.find().fetch();
        Players.update(allPlayers[i]._id,{$set: {score: 0}});
        Players.update(allPlayers[i]._id,{$set: {success: false}});
        Players.update(allPlayers[i]._id,{$set: {selected: false}});
        Players.update(allPlayers[i]._id,{$set: {turn: false}});
        Players.update(allPlayers[i]._id,{$set: {previous: 0}});
        Players.update(allPlayers[i]._id,{$set: {rank: 0}});
      }

      // reset some html and css changes
      $(".subtitle")[0].innerHTML = "Select a player to start the game";
      _.each($(".player"), function(player) {
        player.children[0].style.fontWeight = '300';
        player.children[1].style.display = "none";
      });

      // enable the roll button
      if ($('.roll')[0] !== undefined) {
        $('.roll')[0].disabled = false;
      }
    }
  });

  Template.player.helpers({
    selected: function () {
      if (Players.findOne({turn: true})._id === this._id) {
        return "selected";
      }
    }
  });

  Template.player.events({
    // function triggered when click on player
    'click .player': function () {
      // select the player to start the game
      // bold the player 
      if (Players.find({selected: true}).count() === 0) {
        Players.update(this._id,{$set: {selected:true}});
        Players.update(this._id,{$set: {turn:true}});
        var selectedName = $(this)[0].name;
        _.each($(".player"), function(player) {
          if (player.children[0].innerHTML === selectedName) {
            player.children[0].style.fontWeight = "bold";
          }
        });
      }
    }
  });

  Template.player.events({
    'hover': function() {
      // only change background color when no player is selected to start the game
      // this is to emphasize we cannot select other players when game starts
      if (Players.find({selected: true}).count() === 0) {
        $(this).css("background-color", "#fefff4");
      }
    }

  })
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {

    Players.remove({});
    var names = ["Alessa","Blaire","Cathy","Diana"];
    _.each(names, function (name) {
      Players.insert({
        name: name,
        score: 0,
        previous: 0,
        success: false,
        selected: false,
        rank: 0,
        turn: false
      });
    });
  
    Snakes.remove({});
    Snakes.insert({snake: 21, back: 10});
    Snakes.insert({snake: 45, back: 29});
    Snakes.insert({snake: 81, back: 63});
    Snakes.insert({snake: 93, back: 79});

    Ladders.remove({});
    Ladders.insert({ladder: 13, up: 25});
    Ladders.insert({ladder: 32, up: 47});
    Ladders.insert({ladder: 67, up: 74});
    Ladders.insert({ladder: 82, up: 89});

  });
}
