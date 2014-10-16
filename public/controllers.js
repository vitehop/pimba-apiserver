angular.module('pimbaCli',['ngResource']); //mainApp is our main module


//Aqui declaro los endpoints
angular.module('pimbaCli.services').factory('Card', function($resource) {
    return $resource('/api/cards'); // Note the full endpoint address
});


//Aqui controladores especificos para .get() .post() etc.. de los endpoints anteriores
angular.module('pimbaCli.controllers',[]);

angular.module('pimbaCli.controllers').controller('ResourceController',function($scope, Cards) {

    var cards = Cards.get(function() {
        console.log(cards);
    }); // get() returns a single entry

    var entries = Entry.query(function() {
        console.log(entries);
    }); //query() returns all the entries

    $scope.entry = new Entry(); //You can instantiate resource class

    $scope.entry.data = 'some data';

    Entry.save($scope.entry, function() {
        //data saved. do something here.
    }); //saves an entry. Assuming $scope.entry is the Entry object
});