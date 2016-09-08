$(document).ready(function () {
    var config = {
        apiKey: "<ENTER API KEY FOR FIREBASE>",
        authDomain: "<ENTER AUTHORIZED DOMAIN i.e. youapp.firebaseapp.com>",
        databaseURL: "<ENTER DATABASE URL i.e. https://yourapp.firebaseio.com>",
        storageBucket: ""
    };
    firebase.initializeApp(config);

    var $listenChatteeMessageFirebaseRef = "", $listenChatteeStatusFirebaseRef = "", $listenChatteeRowIDFirebaseRef = "", 
        $firebaseRef = "", $listenForChatRequestFirebaseRef = "";

    var $progressBar = $('#progress-bar');
    var $progressPercentage = $('#progress-percentage');
    var $wellContent = $('#content');
    var $leftColumn = $('#row');
    var $messageBody = $('#message-body');
    var $messageText = $('#message-text');
    var $messageSend = $('#message-send');
    var $onlineUsers = $('#stranger-list');
    var $chatRequestAlertDialog = $('#chat-request-alert-dialog');
    var $chatRequestAlertMessage = $('#chat-request-alert-message');
    var $chatRequestAccept = $('#chat-request-accept');
    var $chatRequestDecline = $('#chat-request-decline');
    var $chatRequestSentAlertDialog = $('#chat-request-send-notification');
    var $chatRequestSentNotificationMessage = $('#chat-request-sent-notification-message');
    var $chatBox = $('#chat-box');
    var $chatteeActivityStatus = $('#chattee-status');
    var $requestTimeRemaining = $('#request-time');
    var $exitChat = $('#exit-chat');

    var $strangerUserListPanel = $('#stranger-list-panel');
    var $activityStatus = $('#activity-status');

    var $currentUserID = "";
    var $chatteeID = "";
    var $chatteeRowID = "";
    var $currentUserRowID = "";

    var $sentRequestRowID = "";
    var $requestInterval = "";

    $progressPercentage.attr('style', 'width: 30%').html('Getting your username');

    /*
    Common step for chatter and chattee
    */
    setUsername();

    $progressPercentage.attr('style', 'width: 60%').html('Searching who\'s online');

    /*
    Common step for chatter and chattee
    */
    monitorVisibilityStatus();

    /*
    Common step for chatter and chattee
    */
    monitorActivityStatus();

    /*
    Common step for chatter and chattee
    */
    getActiveUsers();

    /*
    Common step for chatter and chattee
    */
    startListeningForChatRequests();

    $progressPercentage.attr('style', 'width: 100%').html('You are ready to go..!');
    $progressBar.fadeOut(200);

    /*
    Common step for chatter and chattee
    */
    function setUsername() {
        // Getting username and unique user id from session storage
        $currentUserRowID = sessionStorage.getItem('rowid');
        $currentUserID = sessionStorage.getItem('username');

        // Setting page values
        document.title = $currentUserID + ' - StrangerChat';
        $('#nickname').val($currentUserID);

        $listenForChatRequestFirebaseRef = firebase.database().ref('chats/' + $currentUserRowID + '/request');

        // Displaying well content block once username is set in page
        $wellContent.fadeIn(200);

        console.log('Username set');
    };

    function getActiveUsers() {
        firebase.database().ref('chats').orderByChild('online').equalTo(1).limitToLast(10).once('value').then(function (activeUsers) {
            activeUsers.forEach(function (userData) {
                if(userData.val().nickname != $currentUserID){
                    $onlineUsers.append('<button type="button" class="list-group-item" data-id="'+ userData.key +'">' 
                                        + userData.val().nickname + '</button>');
                }
            });
            $('#stranger-list button').on('click', sendChatRequest);
        });
        $leftColumn.fadeIn(200);
        $progressPercentage.attr('style', 'width: 90%').html('Finalizing things');
        console.log('Retrieved active users list');
    };

    function startListeningForChatRequests() {
        $listenForChatRequestFirebaseRef.on('value', function (chatRequest) {
            $chatteeRowID = chatRequest.val().id;
            $chatteeID = chatRequest.val().username;
            if ($chatteeRowID == "" || $chatteeRowID == null) {
                $chatRequestAlertDialog.hide();
            }
            else if($sentRequestRowID == $chatteeRowID){
                if($requestInterval != ""){
                    clearInterval($requestInterval);
                    $requestInterval = "";
                }
                $listenForChatRequestFirebaseRef.off('value');
                $chatRequestSentAlertDialog.hide();
                startChat($chatteeID);
            }
            else {
                $listenForChatRequestFirebaseRef.off('value');
                document.getElementById('chat-request-sound').play();
                $chatRequestAlertMessage.html('You\'ve received chat request from ' + $chatteeID);
                $chatRequestAccept.on('click', chatRequestAccept);
                $chatRequestDecline.on('click', chatRequestDecline);
                $chatRequestAlertDialog.slideDown(200);
            }
        });
        console.log('Listening to chat requests');
    };

    function chatRequestAccept() {
        firebase.database().ref('chats/' + $chatteeRowID + '/request').update({
            id: $currentUserRowID,
            username: $currentUserID
        });
        console.log('Request accepted');
        startChat($chatteeID);
    };

    function chatRequestDecline() {
        firebase.database().ref('chats/' + $currentUserRowID + '/request').update({
            id: "",
            username: ""
        });
        startListeningForChatRequests();
    };

    function sendChatRequest() {
        $sentRequestRowID = $(this).attr('data-id');
        firebase.database().ref('chats/' + $sentRequestRowID).update({
            request:{
                id: $currentUserRowID,
                username: $currentUserID
            }
        });
        $strangerUserListPanel.hide();
        $chatRequestSentAlertDialog.slideDown(200);
        $firebaseRef = firebase.database().ref('chats/' + $sentRequestRowID + '/request/id');
        $firebaseRef.on('value', monitorChatteeRowID);
        var $remainingTime = 30;    // Countdown from 30 seconds
        $requestInterval = setInterval(function(){
            if($remainingTime > 0){
                $remainingTime--;
                $requestTimeRemaining.html($remainingTime);
            } else{
                clearInterval($requestInterval);
                $requestInterval = "";
                firebase.database().ref('chats/' + $sentRequestRowID + 'request').update({
                    id: ""
                });
                $sentRequestRowID = "";
                $chatRequestSentAlertDialog.slideUp(200);
                $strangerUserListPanel.show();
            }
        }, 1000);
    };

    function monitorChatteeRowID (rowID) {
            if(rowID.val() == ""){
                clearInterval($requestInterval);
                $firebaseRef.off('value');
                $requestInterval = "";
                $sentRequestRowID = "";
                $chatRequestSentAlertDialog.slideUp(300);
                $strangerUserListPanel.show();
            }
        }

    function monitorVisibilityStatus(){
        // Set the name of the hidden property and the change event for visibility
        var hidden, visibilityChange, onlineStatus; 
        if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
          hidden = "hidden";
          visibilityChange = "visibilitychange";
        } else if (typeof document.mozHidden !== "undefined") {
          hidden = "mozHidden";
          visibilityChange = "mozvisibilitychange";
        } else if (typeof document.msHidden !== "undefined") {
          hidden = "msHidden";
          visibilityChange = "msvisibilitychange";
        } else if (typeof document.webkitHidden !== "undefined") {
          hidden = "webkitHidden";
          visibilityChange = "webkitvisibilitychange";
        }

        function handleVisibilityChange() {
          if (document[hidden]) {
              $activityStatus.attr('class', 'label label-danger').html('inactive');
              onlineStatus = 2;
          } else {
              $activityStatus.attr('class', 'label label-success').html('online');
              onlineStatus = 1;
          }
            firebase.database().ref('chats/' + $currentUserRowID).update({
                online: onlineStatus
            });
        }

        // Warn if the browser doesn't support addEventListener or the Page Visibility API
        if (typeof document.addEventListener === "undefined" || typeof document[hidden] === "undefined") {
          alert("This app requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
        } else {
          // Handle page visibility change   
          document.addEventListener(visibilityChange, handleVisibilityChange, false);
            console.log('Monitoring visibility change');
        }
    };

    function monitorActivityStatus(){
        // Firebase checks for connection activity and updates online status - Useful when user closes browser
        var myConnectionsRef = firebase.database().ref('chats/' + $currentUserRowID + '/');
        var connectedRef = firebase.database().ref('.info/connected');
        connectedRef.on('value', function(snap) {
          if (snap.val() === true) {
              myConnectionsRef.update({
              online: 1
              });

              myConnectionsRef.onDisconnect().update({
                  online: 0,
                  lastOnline: firebase.database.ServerValue.TIMESTAMP,
                  request: {
                      id: "",
                      username: ""
                  },
                  message: ""
              });
          }
        });
        console.log('Monitoring connectivity change');
    };

    function sendMessage() {
        $messageBody.append('<p class=\"text-right\">' + $messageText.val() + '</p>');
        firebase.database().ref('chats/' + $chatteeRowID).update({
            message: $messageText.val()
        });
        $messageText.val('');
        scrollToBottom(100);
    };

    /*
    Move these two to start chat function
    */
    $messageSend.on('click', sendMessage);
    $messageText.keypress(function(){
        if(event.keyCode == 13){
            sendMessage();
        }
    });

    function scrollToBottom (duration) {
        var scrollHeight = $messageBody.prop("scrollHeight");
        $messageBody.stop().animate({scrollTop: scrollHeight}, duration || 0);
    };

    function startChat(chatteeUsername) {
        $strangerUserListPanel.slideUp(200, function () {
            $chatRequestAlertDialog.slideUp(200, function(){
                $listenChatteeMessageFirebaseRef = firebase.database().ref('chats/' + $currentUserRowID + '/message');
                $listenChatteeStatusFirebaseRef = firebase.database().ref('chats/' + $chatteeRowID + '/online');
                $listenChatteeRowIDFirebaseRef = firebase.database().ref('chats/' + $chatteeRowID + '/request');
                $('#chattee-id').html('You\'re chatting with ' + chatteeUsername);
                $messageText.attr('disabled', false);
                $messageSend.attr('disabled', false);
                $messageBody.html('');
                console.log('Chat window open');
                $chatBox.slideDown(200, function(){
                    listenChatteeRowID();
                    listenForChatteeStatus();
                    listenForMessageFromChattee();
                }); 
                $exitChat.on('click', closeChat);
            })
        });
        $messageBody.animate({ scrollTop: $messageBody[0].scrollHeight}, 1000);
    };

    function closeChat(){
        $chatBox.slideUp(200, function(){
            // Stop listening to message from chattee
            $listenChatteeMessageFirebaseRef.off('value');
            // Stop listening to chattee status
            $listenChatteeStatusFirebaseRef.off('value');
            // Make changes in back-end
            firebase.database().ref('chats/' + $currentUserRowID).update({
                request: {
                    id: "",
                    username: ""
                },
                message: ""
            });
            $strangerUserListPanel.slideDown(200, function(){
                startListeningForChatRequests();
            });
        });
    }

    function listenForMessageFromChattee(){
        $listenChatteeMessageFirebaseRef.on('value', function (chatteeMessage) {
            $messageBody.append('<p class=\"text-left\ text-primary">' + chatteeMessage.val() + '</p>');
            document.getElementById('new-chat-sound').play();
            scrollToBottom(100);
        });
        console.log('Listening for message from chattee');
    };

    function listenChatteeRowID () {
            $listenChatteeRowIDFirebaseRef.on('value', function(requestFromID){
                if(requestFromID.val().id == ""){
                    $listenChatteeRowIDFirebaseRef.off('value');
                    // Stop listening to message from chattee
                    $listenChatteeMessageFirebaseRef.off('value');
                    // Stop listening to chattee status
                    $listenChatteeStatusFirebaseRef.off('value');
                    $messageText.attr('disabled', true);
                    $messageSend.attr('disabled', true);
                    $messageBody.append('<p class=\"text-center\"><i>User left the chat.</i></p>');
                    console.log('Chat discontinued.');
                }
            });
        console.log('Listening for chattee row id');
        };

    function listenForChatteeStatus(){
        $listenChatteeStatusFirebaseRef.on('value', function (chatteeOnline) {
            var chatteeOnlineStatus = chatteeOnline.val();
            if(chatteeOnlineStatus === 0){
                $chatteeActivityStatus.attr('class', 'label label-danger').html('offline');
                $messageText.attr('disabled', true);
                $messageSend.attr('disabled', true);
            } else if(chatteeOnlineStatus === 1){
                $chatteeActivityStatus.attr('class', 'label label-success').html('online');
            } else {
                $chatteeActivityStatus.attr('class', 'label label-warning').html('inactive');
            }
        });
        console.log('Listening for chattee status');
    };
});