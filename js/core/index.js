$(document).ready(function(){
    var $getStarted = $('#get-started');

    // Initialize Firebase
    var config = {
        apiKey: "<ENTER API KEY FOR FIREBASE>",
        authDomain: "<ENTER AUTHORIZED DOMAIN i.e. youapp.firebaseapp.com>",
        databaseURL: "<ENTER DATABASE URL i.e. https://yourapp.firebaseio.com>",
        storageBucket: ""
    };
    firebase.initializeApp(config);

    $getStarted.on('click', function(){
        $getStarted.off('click').attr('disabled', 'disabled');
        $getStarted.html('<span class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span> Setting things up...');
        firebase.database().ref('stats/userid').once('value').then(function (previousUserID) {
            addNewUserID(previousUserID.val() + 1);
        });
    });

    function addNewUserID(newUserID){
        firebase.database().ref('stats').update({
            userid: newUserID
        });
        var $nickname = 'sChat' + newUserID;
        var $rowID = firebase.database().ref('chats').push({
            message: "",
            nickname: $nickname,
            online: 1,
            request: {
                id: "",
                username: ""
            },
            firstOnline: firebase.database.ServerValue.TIMESTAMP
            }).key;
        $getStarted.html('<span class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span> Almost there');
        // Save data to sessionStorage
        sessionStorage.setItem('rowid', $rowID);
        sessionStorage.setItem('username', $nickname);
        window.location.href = "chat.html";
    }
});