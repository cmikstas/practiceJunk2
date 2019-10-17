// GLOBAL VARIABLES
// variables used for timer function
var time = 180; // time has to be 1 second less than the time you want to display
var minutes = Math.trunc(time / 60);
var seconds = time % 60;
var timeString = minutes + ":" + seconds;
var intervalId;
// variable that will be part of limiting results selection to three
var resultsSelect = 0;

// array used to store checked restaurants
var selectionArray = [];
// array used to store map markers
var markers = [];
var map;

// boolean that is used to disable checkbox clicks and search button while poll is running
var isPollRunning = false;

/***********************************************************/
// boolean that disables voting buttons after a vote is cast
//var isVoteCast = false;

// variables for incrementing vote count
//var votes0 = 0;
//var votes1 = 0;
//var votes2 = 0;
/***********************************************************/

// FIREBASE
// code for loading Firebase
// Your web app's Firebase configuration
var firebaseConfig = 
{
    apiKey: "AIzaSyAxi3aBaAVwoeWzOhYOqe-C8R30NCZQE6k",
    authDomain: "votefirebase-3de2b.firebaseapp.com",
    databaseURL: "https://votefirebase-3de2b.firebaseio.com",
    projectId: "votefirebase-3de2b",
    storageBucket: "votefirebase-3de2b.appspot.com",
    messagingSenderId: "184385654680",
    appId: "1:184385654680:web:cecbe4a0812748043465ed"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();

$(document).ready(function () 
{
    //variables for Yelp API calls
    var term = '';
    var location = '';
    var name = '';
 
    geoInitialize();

    // used to display 3:00 for timer div
    // if you change the time in the global variable for the timer, you need to change it here as well
    $("#timer").html("3:00");

    //search onclick that grabs values and stores from term and location
    $("#search").on("click", function (event)
    {
        // part of code that disables button when poll is running.
        if (isPollRunning === true) 
        {
            console.log("button disabled");
            return;
        }

        location = $("#locationInput").val().trim();
        console.log(location);
        term = $("#termInput").val().trim();
        yelpAPI();
        geoFirstClick();
        event.preventDefault();
    });

    //Ajax Call for Yelp API
    function yelpAPI() 
    {
        var queryUrl = "https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/search?term=" + term + "&location=" + location;

        $.ajax({
            url: queryUrl,
            headers: 
            {
                'Authorization': 'Bearer u5IOLfLv5NDHJQEgaAnpyOMD904ThILvNdDS5ldBH2VX7a3fuCvRX6MEASunCHQEofphTnitG_YdiO9-pN9xcEDs11XZcbbqRYaIotN0SmE0ySvkvThDNCt7TxmWXXYx',
            },
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                $.each(data.businesses, function (i, response)
                {
                    //console.log(response);
                    name = response.name;
                    location = response.location;

                    var resultsDiv = $("<div>");

                    // checkbox code
                    var label = $("<label>");
                    var checkbox = $("<input>");
                    var span = $("<span>");

                    checkbox.attr("type", "checkbox", "class", "ml-1 form-checkbox", "checked", "false");
                    span.attr("class", "ml-2");

                    label.append(checkbox);
                    label.append(span);

                    // self variable had to be created to reference a proper scope
                    // for the variables needed
                    var self = this;

                    // code that tracks the amount of results selected
                    // checkbox.on click is a call back function
                    checkbox.on("click", function (event)
                    {
                        // this function disables the checkbox onclick event from processing
                        // data and from removing or adding the map markers

                        if (isPollRunning === true)
                        {
                            console.log("button disabled");
                            var status = checkbox.prop("checked");
                            checkbox.prop("checked", !status);
                            return;
                        }

                        // console.log("Restaurant selected");
                        if ($(this).prop("checked") === true)
                        {
                            if (resultsSelect >= 3)
                            {
                                checkbox.prop("checked", false);
                                // enables Begin Poll button once 3 restaurant options are selected
                                $("#beginPollBtn").removeClass("opacity-50 cursor-not-allowed");

                                console.log("Max selections already reached.");
                            }
                            else
                            {
                                resultsSelect++;

                                // checks to see if 3 selections have been made. if three selections have 
                                // been made, then the poll button is enabled.
                                if (resultsSelect === 3)
                                {
                                    $("#beginPollBtn").removeClass("opacity-50 cursor-not-allowed");
                                }
                                else
                                {
                                    $("#beginPollBtn").addClass("opacity-50 cursor-not-allowed");

                                }

                                // object that stores items that will be pushed into array
                                // and added to firebase
                                var selectionObject =
                                {
                                    name: self.name,
                                    lng: self.coordinates.longitude,
                                    lat: self.coordinates.latitude,
                                    addr: self.location.display_address,
                                    rating: self.rating,
                                    reviewCount: self.review_count,
                                    //price: self.price,
                                    phone: self.phone,
                                    city: self.location.city,
                                    url: self.url,
                                };

                                // command that pushes object into selectionArray
                                selectionArray.push(selectionObject);
                                addMarker(selectionObject);
                            }
                        }

                        else
                        {
                            resultsSelect--;
                            // disables Begin Poll button until 3 restaurant options are selected
                            $("#beginPollBtn").addClass("opacity-50 cursor-not-allowed");

                            // iterates through the array and finds the name of the restaurant 
                            // to be removed.
                            for (let i = 0; i < selectionArray.length; i++)
                            {
                                if
                                (
                                    selectionArray[i].name === self.name &&
                                    selectionArray[i].lng === self.coordinates.longitude &&
                                    selectionArray[i].lat === self.coordinates.latitude
                                ) 
                                {
                                    removeMarker(selectionArray[i]);
                                    selectionArray.splice(i, 1);
                                }
                            }
                        }
                    });

                    resultsDiv.attr('class', 'selectedRes rounded border-solid bg-gray-800 text-white border-2 mt-1 border-black');
                    span.append(name);
                    resultsDiv.attr('data-longitude', response.coordinates.longitude);
                    resultsDiv.attr('data-latitude', response.coordinates.latitude);
                    resultsDiv.attr('data-name', response.name);
                    resultsDiv.append(label);
                    $("#results").append(resultsDiv);

                });
            }
        });
    }

    // function to add a marker to google map
    function addMarker(selectionObject)
    {
        // creates a marker and adds it to google maps
        var thisMarker = new google.maps.Marker
            ({
                position: { lat: selectionObject.lat, lng: selectionObject.lng },
                map: map,
                title: selectionObject.name,
                //price: selectionObject.price,
                rating: selectionObject.rating,
                reviewCount: selectionObject.reviewCount,
                city: selectionObject.city
            });
        //adds info window to click.
        var contentString = '<div id="content">' +
            '<div id="siteNotice">' +
            '</div>' +
            '<h1 id="firstHeading" class="firstHeading">' + selectionObject.name + '</h1>' +
            '<div id="bodyContent">' +
            '<ul>'
        '<li>Rating: ' + selectionObject.rating + '</li>'
        '<li>Total Reviews: ' + selectionObject.reviewCount + '</li>'
        '<li>City: ' + selectionObject.city + '</li>';

        var infowindow = new google.maps.InfoWindow({
            content: contentString
        });

        thisMarker.addListener('click', function ()
        {
            infowindow.open(map, thisMarker);
        });

        // adds a new marker to the markers array
        markers.push(thisMarker);
    }

    // function to remove a marker from the map
    function removeMarker(selectionObject)
    {
        for (let i = 0; i < markers.length; i++)
        {
            if
            (
                markers[i].title === selectionObject.name &&
                markers[i].position.lat().toFixed(5) === selectionObject.lat.toFixed(5) &&
                markers[i].position.lng().toFixed(5) === selectionObject.lng.toFixed(5)
            )
            {
                // removes the marker from the map and the marker array.
                markers[i].setMap(null);
                markers.splice(i, 1);
            }
        }
    }

    // function that deletes all markers from map
    function removeAllMarkers()
    {
        for (let i = 0; i < markers.length; i++)
        {
            // removes the marker from the map and the marker array.
            markers[i].setMap(null);
        }

        markers = [];
    }

    //google map API js

    function geoInitialize()
    {
        // Create a map centered in SLC.
        map = new google.maps.Map(document.getElementById('map'),
        {
            center: { lat: 40.7608, lng: -111.8910 },
            zoom: 9
        });
    }

    var geoResponse;

    function geoFirstClick(city)
    {

        var geoApiKey = 'AIzaSyCK4EWTo5MHbt_OTstSiYYGKw5twoR8xuk'
        var geoQueryUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + location + '&key=' + geoApiKey;


        $.ajax({
            url: geoQueryUrl,
            method: "GET"
        }).then(function (response) {

            geoResponse = response.results[0].geometry.location

            geoFirstClickUpdate(geoResponse)
        });
    }

    function geoFirstClickUpdate(geoResponse) {
        map = new google.maps.Map(document.getElementById('map'), {
            center: geoResponse,
            zoom: 9
        });
    }

    $("#beginPollBtn").on("click", function (event)
    {
        // keeps button disabled until three selections are made
        if (resultsSelect !== 3)
        {
            console.log("button disabled");
            return;
        }

        if (isPollRunning === true)
        {
            console.log("button disabled");
            return;
        }

        localStorage.setItem("isMaster", "true");

        var ref = firebase.database().ref("projectUno");
        // ref.remove empties out "projectUno" folder that is created in firebase
        ref.remove();

        // on any computer that is logged on to the webpage.
        database.ref("projectUno/clearVoteStatus").push("Pizza");
        database.ref("projectUno/pollStatus").push({ isPollRunning: true });
        database.ref("projectUno/clearVoteStatus").remove();
        
        clearInterval(intervalId);
        intervalId = setInterval(countDown, 1000);
    });

    // pushes up to firebase and changes boolean to false
    $("#resetPoll").on("click", function (event) {
        var ref = firebase.database().ref("projectUno");
        ref.remove();

        database.ref("projectUno/pollStatus").push({ isPollRunning: false });
    });

    database.ref("projectUno/clearVoteStatus").on("child_added", function (childSnapshot)
    {
        console.log("made it to fireBase");
        localStorage.setItem("isVoteCast", "false");
        localStorage.setItem("votes0", "0");
        localStorage.setItem("votes1", "0");
        localStorage.setItem("votes2", "0");
    });

    // this function controls what happens when the user hits either the start new or begin button
    // from FireBase
    database.ref("projectUno/pollStatus").on("child_added", function (childSnapshot)
    {
        var cs = childSnapshot.val();
        database.ref("projectUno/geoData").push(geoResponse);
        // this statement is run when the user selects reset poll
        if (!cs.isPollRunning)
        {
            //console.log("here");
            localStorage.setItem("isMaster", "false");
            localStorage.setItem("isVoteCast", "false");
            localStorage.setItem("votes0", "0");
            localStorage.setItem("votes1", "0");
            localStorage.setItem("votes2", "0");
            time = 180;
            $("#timer").html("3:00");
            isPollRunning = false;
            resultsSelect = 0;
            $("#locationInput").val("");
            $("#termInput").val("");
            $("#search").removeClass("opacity-50 cursor-not-allowed");
            $("#beginPollBtn").addClass("opacity-50 cursor-not-allowed");
            $("#pollDiv").empty();
            removeAllMarkers();
            selectionArray = [];
            // console.log(selectionArray);
            $("#results").empty();
            clearInterval(intervalId);
        }
        //this statement is run if the user selects the begin poll button
        else
        {
            isPollRunning = true;
            // clearInterval(intervalId);
            //intervalId = setInterval(countDown, 1000);
            $("#search").addClass("opacity-50 cursor-not-allowed");
            $("#beginPollBtn").addClass("opacity-50 cursor-not-allowed");
            database.ref("projectUno/geoData").push(geoResponse);
            // uploads yelp data to firebase in sub-folder called "projectUno/pollChoices"
            database.ref("projectUno/pollChoices").push(selectionArray);
        }
    });

    database.ref("projectUno/timeData").on("child_added", function (childSnapshot)
    {
        var csTimeString = childSnapshot.val();

        $("#timer").html(csTimeString.timeString);

        var fireBaseTime = csTimeString.time;

        if (fireBaseTime <= 0) {
            localStorage.setItem("isMaster", "false");
            clearInterval(intervalId);
            $("#timer").html("0:00");
            console.log("time's up!")
            voteResult();
        }
    });

    database.ref("projectUno/geoData").on("child_added", function (childSnapshot)
    {
        var cs = childSnapshot.val();
        var geoResponselat = cs.lat;
        var geoResponselng = cs.lng;
        // console.log(geoResponseAll)
        console.log(geoResponselat)
        console.log(geoResponselng)
        console.log(cs.lat)
        console.log(cs.lng)
        console.log(geoUpdate)
        geoUpdate();
        function geoUpdate() {
            map = new google.maps.Map(document.getElementById('map'),
            {
                center: { lat: geoResponselat, lng: geoResponselng },
                zoom: 9
            });
        }
    })

    // this is the child added listener that runs when the begin poll button is clicked
    database.ref("projectUno/pollChoices").on("child_added", function (childSnapshot)
    {
        console.log(childSnapshot.val());

        var cs = childSnapshot.val();


        // this might not be needed
        var childKey = childSnapshot.key;

        // store snapshot information into a variable
        var restName0 = cs[0].name;
        var restAddress0 = cs[0].addr;
        var restRating0 = cs[0].rating;
        var restURL0 = cs[0].url;

        var restName1 = cs[1].name;
        var restAddress1 = cs[1].addr;
        var restRating1 = cs[1].rating;
        var restURL1 = cs[1].url;

        var restName2 = cs[2].name;
        var restAddress2 = cs[2].addr;
        var restRating2 = cs[2].rating;
        var restURL2 = cs[2].url;

        // removes markers and then readds to all computers that log in

        removeAllMarkers();

        for (let i = 0; i < cs.length; i++)
        {
            addMarker(
                {
                    name: cs[i].name,
                    lng: cs[i].lng,
                    lat: cs[i].lat,
                });
        }

        // code for option 1
        var voteName0 = $("<p>");
        var voteAddress0 = $("<p>");
        var voteRating0 = $("<p>");
        var voteURL0 = $("<p>");
        // variables for tracking votes
        var voteCount0 = $("<p>").text("Votes: " + localStorage.getItem("votes0"));
        voteCount0.attr("id", "voteP0");

        var voteButton0 = $("<button>");
        voteButton0.attr("id", "0");
        voteButton0.addClass("voteBtn bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 border-b-4 border-green-700 hover:border-green-500 rounded");
        voteButton0.text("Vote");
        var voteLabel0 = $("<div>");
        var voteDiv0 = $("<div>").addClass("mx-2 w-1/3 m-auto h-48 bg-blue-200 border border-white rounded");
        // class added to control changes when vote is cast and when time runs out
        voteDiv0.attr("id", "voteDiv0");

        voteName0.text(restName0);
        voteAddress0.text(restAddress0);
        voteRating0.text("Rating: " + restRating0);
        //voteURL0.text(restURL0);

        voteLabel0.append(voteName0);
        voteLabel0.append(voteAddress0);
        voteLabel0.append(voteRating0);
        //voteLabel0.append(voteURL0);
        voteLabel0.append(voteButton0);
        // coding for adding vote count
        voteLabel0.append(voteCount0);
        voteDiv0.append(voteLabel0);
        $("#pollDiv").append(voteDiv0);

        //code for option 2
        var voteName1 = $("<p>");
        var voteAddress1 = $("<p>");
        var voteRating1 = $("<p>");
        var voteURL1 = $("<p>");
        //
        var voteCount1 = $("<p>").text("Votes: " + localStorage.getItem("votes1"));
        voteCount1.attr("id", "voteP1");

        var voteButton1 = $("<button>");
        voteButton1.attr("id", "1");
        voteButton1.addClass("voteBtn bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 border-b-4 border-green-700 hover:border-green-500 rounded");
        voteButton1.text("Vote");
        var voteLabel1 = $("<div>");
        var voteDiv1 = $("<div>").addClass("w-1/3 m-auto h-48 bg-blue-200 border border-white rounded");
        //
        voteDiv1.attr("id", "voteDiv1");

        voteName1.text(restName1);
        voteAddress1.text(restAddress1);
        voteRating1.text("Rating: " + restRating1);
        //voteURL1.text(restURL1);

        voteLabel1.append(voteName1);
        voteLabel1.append(voteAddress1);
        voteLabel1.append(voteRating1);
        //voteLabel1.append(voteURL1);
        voteLabel1.append(voteButton1);

        voteLabel1.append(voteCount1);
        voteDiv1.append(voteLabel1);
        $("#pollDiv").append(voteDiv1);

        //code for option 3
        var voteName2 = $("<p>");
        var voteAddress2 = $("<p>");
        var voteRating2 = $("<p>");
        var voteURL2 = $("<p>");

        var voteCount2 = $("<p>").text("Votes: " + localStorage.getItem("votes2"));
        voteCount2.attr("id", "voteP2");

        var voteButton2 = $("<button>");
        voteButton2.attr("id", "2");
        voteButton2.addClass("voteBtn bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 border-b-4 border-green-700 hover:border-green-500 rounded");
        voteButton2.text("Vote");
        var voteLabel2 = $("<div>");
        var voteDiv2 = $("<div>").addClass("mx-2 w-1/3 m-auto h-48 bg-blue-200 border border-white rounded");
        //
        voteDiv2.attr("id", "voteDiv2");

        voteName2.text(restName2);
        voteAddress2.text(restAddress2);
        voteRating2.text("Rating: " + restRating2);
        //voteURL2.text(restURL2);

        voteLabel2.append(voteName2);
        voteLabel2.append(voteAddress2);
        voteLabel2.append(voteRating2);
        //voteLabel2.append(voteURL2);
        voteLabel2.append(voteButton2);
        //
        voteLabel2.append(voteCount2);
        voteDiv2.append(voteLabel2);
        $("#pollDiv").append(voteDiv2);

        if (localStorage.getItem("isVoteCast") === "true") 
        {
            $(".voteBtn").addClass("opacity-50 cursor-not-allowed");
            if (localStorage.getItem("buttonClicked") == "0")
            {
                $("#voteDiv0").removeClass("bg-blue-200");
                $("#voteDiv0").addClass("bg-green-200");
            }

            else if (localStorage.getItem("buttonClicked") == "1")
            {
                $("#voteDiv1").removeClass("bg-blue-200");
                $("#voteDiv1").addClass("bg-green-200");
            }

            else if (localStorage.getItem("buttonClicked") == "2")
            {
                $("#voteDiv2").removeClass("bg-blue-200");
                $("#voteDiv2").addClass("bg-green-200");
            }
        }

        // code that tracks vote totals
        $(".voteBtn").on("click", function (event)
        {
            console.log($(this).attr("id"))

            localStorage.setItem("buttonClicked", $(this).attr("id"))

            if (localStorage.getItem("isVoteCast") === "true")
            {
                console.log("Button0 Disabled, son");
                return;
            }

            // setting boolean to true MUST come after if statement or it won't work
            //isVoteCast = true;
            localStorage.setItem("isVoteCast", "true");
            $(".voteBtn").addClass("opacity-50 cursor-not-allowed");

            var votes00 = localStorage.getItem("votes0");
            var votes01 = localStorage.getItem("votes1");
            var votes02 = localStorage.getItem("votes2");

            var votes0 = parseInt(votes00);
            var votes1 = parseInt(votes01);
            var votes2 = parseInt(votes02);

            // this refers back to the button click
            if ($(this).attr("id") === "0")
            {
                votes0++;
                console.log("Votes: " + votes0);
                localStorage.setItem("votes0", votes0);


                $("#voteDiv0").removeClass("bg-blue-200");
                $("#voteDiv0").addClass("bg-green-200");
            }

            else if ($(this).attr("id") === "1")
            {
                
                votes1++;
                console.log("Votes: " + votes1);
                localStorage.setItem("votes1", votes1);

                $("#voteDiv1").removeClass("bg-blue-200");
                $("#voteDiv1").addClass("bg-green-200");
            }

            else
            {
                
                votes2++;
                console.log("Votes: " + votes2);
                localStorage.setItem("votes2", votes2);

                $("#voteDiv2").removeClass("bg-blue-200");
                $("#voteDiv2").addClass("bg-green-200");
            }

            // this function removes the vote count that is currently stored in firebase
            var ref2 = firebase.database().ref("projectUno/voteCount");
            ref2.remove();

            // this function grabs the updated vote count and pushes it to firebase
            database.ref("projectUno/voteCount").push({ votes0, votes1, votes2 });

        });
        /******************************************************/

    });

    // this code controls adding the updated vote count to the webpage once it hits firebase and the event listener triggers
    database.ref("projectUno/voteCount").on("child_added", function (childSnapshot)
    {
        var csVote = childSnapshot.val();

        var votes0 = csVote.votes0;
        var votes1 = csVote.votes1;
        var votes2 = csVote.votes2;

        localStorage.setItem("votes0", votes0);
        localStorage.setItem("votes1", votes1);
        localStorage.setItem("votes2", votes2);

        $("#voteP0").text("Votes: " + votes0);
        $("#voteP1").text("Votes: " + votes1);
        $("#voteP2").text("Votes: " + votes2);
    });

});

// function that handles timer when polling is open
function countDown()
{
    time--;
    localStorage.setItem("timerVal", time);
    minutes = Math.trunc(time / 60);
    seconds = time % 60;

    if (seconds < 10)
    {
        seconds = "0" + seconds;
    }

    timeString = minutes + ":" + seconds;
    console.log("megapizzaparty");
    database.ref("projectUno/timeData").push({time: time, timeString: timeString});
}

/**************************************************/
// function that is called when timer hits 0
function voteResult() 
{
    var votes0 = localStorage.getItem("votes0");
    var votes1 = localStorage.getItem("votes1");
    var votes2 = localStorage.getItem("votes2");

    votes0 = parseInt(votes0);
    votes1 = parseInt(votes1);
    votes2 = parseInt(votes2);

    if (votes0 > votes1 && votes0 > votes2)
    {
        $("#voteDiv0").removeClass("bg-blue-200");
        $("#voteDiv0").removeClass("bg-green-200");
        $("#voteDiv0").addClass("bg-red-200");
    }

    else if (votes1 > votes0 && votes1 > votes2)
    {
        $("#voteDiv1").removeClass("bg-blue-200");
        $("#voteDiv1").removeClass("bg-green-200");
        $("#voteDiv1").addClass("bg-red-200");
    }

    else if (votes2 > votes0 && votes2 > votes1)
    {
        $("#voteDiv2").removeClass("bg-blue-200");
        $("#voteDiv2").removeClass("bg-green-200");
        $("#voteDiv2").addClass("bg-red-200");
    }

}
/******************************************************/

// check to see if master is refreshed when it's sending out the time
if (localStorage.getItem("isMaster") === "true")
{
    console.log("pizzaparty");
    var tempTime = localStorage.getItem("timerVal");
    time = parseInt(tempTime);
    clearInterval(intervalId);
    intervalId = setInterval(countDown, 1000);
}