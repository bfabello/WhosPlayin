
var request = require("request")

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

    // if (event.session.application.applicationId !== "") {
    //     context.fail("Invalid Application ID");
    //  }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == "GetInfoIntent") {
        handleGetInfoIntent(intent, session, callback)
    }else if (intentName == "GetUpcomingIntent") {
        handleGetUpcomingIntent(intent, session, callback)
    }
    else if (intentName == "AMAZON.YesIntent") {
        handleYesIntent(intent, session, callback)
    }else if (intentName == "AMAZON.NoIntent") {
        handleFinishSessionRequest(intent, session, callback)
    }else if (intentName == "GetDateIntent") {
        handlesDateIntent(intent, session, callback)
    } else {
         throw "Invalid intent"
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {

}

function handleYesIntent(intent, session, callback) {

    var speechOutput = "Okay. When? "
    //user will ask for date (today)

    
    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))

}

function handlesDateIntent(intent, session, callback) {

    var slotValue = intent.slots.date.value;
    var eventDate = getDateFromSlot(slotValue);

    var speechOutput = "Today is " + eventDate[0] + "This artist is playing at seven. " + "Do you want to check another date?"

    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
}



function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a custom closing statment when the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("See you later!", "", true));
}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    var speechOutput = "Welcome to Who's Playin. You can search for events by date at the Catalyst. What would you like to do?"

    var reprompt = "Do you want to hear about some events playing at The Catalyst?"

    var header = "Get Info"

    var shouldEndSession = false

    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

function handleGetInfoIntent(intent, session, callback) {

    var speechOutput = "We have an error"

    getJSON(function(data) {
        if (data != "ERROR") {
            var speechOutput = data
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}
function handleGetUpcomingIntent(intent, session, callback) {

    var speechOutput = "We have an error"

    getUpcomingShows(function(data) {
        if (data != "ERROR") {
            var speechOutput = data
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}
function url() {
    return "http://api.songkick.com/api/3.0/venues/1092/calendar.json?apikey=lEvytpwl4q8UYTJf"
}

function getUpcomingShows(callback) {
       request.get(url(), function(error, response, body) {
        var d = JSON.parse(body)
        var result = d.resultsPage.results.event
        var title = ""
        if(result.length > 0) {
            for(var i = 0; i < 5; i++) {
                title += result[i].displayName + " "
            }
            callback(title)
        }
        else {
            callback("ERROR")
        }
    }) 
}

function getJSON(callback) {
    //Songkick displayName
    request.get(url(), function(error, response, body) {
        var d = JSON.parse(body)
        var result = d.resultsPage.results.event
        if(result.length > 0) {
            callback(result[0].displayName)
        }
        else {
            callback("ERROR")
        }
    })
    
    // // Songkick date
    // request.get(url3(), function(error, response, body) {
    //     var d = JSON.parse(body)
    //     var result = d.resultsPage.results.event
    //     if(result.length > 0) {
    //         callback(result[0].start.date)
    //     }
    //     else {
    //         callback("ERROR")
    //     }
    // }) 
}


// ------- Helper functions to build responses for Alexa -------
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}


// Given an AMAZON.DATE slot value parse out to usable JavaScript Date object
// Utterances that map to the weekend for a specific week (such as �this weekend�) convert to a date indicating the week number and weekend: 2015-W49-WE.
// Utterances that map to a month, but not a specific day (such as �next month�, or �December�) convert to a date with just the year and month: 2015-12.
// Utterances that map to a year (such as �next year�) convert to a date containing just the year: 2016.
// Utterances that map to a decade convert to a date indicating the decade: 201X.
// Utterances that map to a season (such as �next winter�) convert to a date with the year and a season indicator: winter: WI, spring: SP, summer: SU, fall: FA)
function getDateFromSlot(rawDate) {
    // try to parse data
    var date = new Date(Date.parse(rawDate));
    var result;
    // create an empty object to use later
    var eventDate = {

    };

    // if could not parse data must be one of the other formats
    if (isNaN(date)) {
        // to find out what type of date this is, we can split it and count how many parts we have see comments above.
        var res = rawDate.split("-");
        // if we have 2 bits that include a 'W' week number
        if (res.length === 2 && res[1].indexOf('W') > -1) {
            var dates = getWeekData(res);
            eventDate["startDate"] = new Date(dates.startDate);
            eventDate["endDate"] = new Date(dates.endDate);
            // if we have 3 bits, we could either have a valid date (which would have parsed already) or a weekend
        } else if (res.length === 3) {
            var dates = getWeekendData(res);
            eventDate["startDate"] = new Date(dates.startDate);
            eventDate["endDate"] = new Date(dates.endDate);
            // anything else would be out of range for this skill
        } else {
            eventDate["error"] = dateOutOfRange;
        }
        // original slot value was parsed correctly
    } else {
        eventDate["startDate"] = new Date(date).setUTCHours(0, 0, 0, 0);
        eventDate["endDate"] = new Date(date).setUTCHours(24, 0, 0, 0);
    }
    return eventDate;
}

// Given a week number return the dates for both weekend days
function getWeekendData(res) {
    if (res.length === 3) {
        var saturdayIndex = 5;
        var sundayIndex = 6;
        var weekNumber = res[1].substring(1);

        var weekStart = w2date(res[0], weekNumber, saturdayIndex);
        var weekEnd = w2date(res[0], weekNumber, sundayIndex);

        return Dates = {
            startDate: weekStart,
            endDate: weekEnd,
        };
    }
}

// Given a week number return the dates for both the start date and the end date
function getWeekData(res) {
    if (res.length === 2) {

        var mondayIndex = 0;
        var sundayIndex = 6;

        var weekNumber = res[1].substring(1);

        var weekStart = w2date(res[0], weekNumber, mondayIndex);
        var weekEnd = w2date(res[0], weekNumber, sundayIndex);

        return Dates = {
            startDate: weekStart,
            endDate: weekEnd,
        };
    }
}

// Used to work out the dates given week numbers
var w2date = function (year, wn, dayNb) {
    var day = 86400000;

    var j10 = new Date(year, 0, 10, 12, 0, 0),
        j4 = new Date(year, 0, 4, 12, 0, 0),
        mon1 = j4.getTime() - j10.getDay() * day;
    return new Date(mon1 + ((wn - 1) * 7 + dayNb) * day);
};

// Loops though the events from the iCal data, and checks which ones are between our start data and out end date
function getEventsBeweenDates(startDate, endDate, eventList) {

    var start = new Date(startDate);
    var end = new Date(endDate);

    var data = new Array();

    for (var i = 0; i < eventList.length; i++) {
        if (start <= eventList[i].start && end >= eventList[i].start) {
            data.push(eventList[i]);
        }
    }

    console.log("FOUND " + data.length + " events between those times");
    return data;
}
