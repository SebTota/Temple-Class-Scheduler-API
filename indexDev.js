const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');
const cors = require('cors'); // CORS issue fix


app.use(cors({origin: '*'})); // Adds CORS header to allow cross origin resource sharing
app.use(bodyparser.json());

let noDataResponse = "Class Does Not Exist";

// Set database variables by calling global variables
var mysqlConnection = mysql.createConnection({
    host: process.env.AWS_URL,
    user: process.env.AWS_USER,
    password: process.env.AWS_PASS,
    database: 'class_scheduler'
});

// Create a connection to the database
mysqlConnection.connect((err)=> {
    if (!err)
        console.log("No error. Database connected");
    else
        console.log("Error connecting database: " + JSON.stringify(err, undefined, 2));
});


// Start listening for api calls on port 3000
app.listen(3000, ()=>console.log("No error. Express server running on port 3000"));

//--- END DEV SERVER --//



// Retrieve all classes from class_scheduler database
app.get('/allClasses',(req,res)=>{
    // Query all all entries from Classes table
    mysqlConnection.query('SELECT * FROM Classes',(err, rows, fields)=>{
        // Print query
        if(!err)
            res.send(rows); // Return results
        else {
            console.log(err); // Log error
            res.send(500); // Return server error
        }
    });
});

// Check if class exists in database
// url:port/checkClass?cls=ClassToCheck
// Query the database to see if a class with ClassToCheck subjectCourse exists
app.get('/checkClass',(req,res)=>{
    var course = req.query.cls;
    mysqlConnection.query("SELECT crn FROM Classes WHERE subjectCourse = ? LIMIT 1", [course],
        (err, rows, fields)=>{
            if (!err) {
                if (rows.length <= 0) {
                    res.send(JSON.stringify(dneResponse));
                } else {
                    res.send("Class Found");
                }
            } else {
                // Log and respond with server error
                console.log(err);
                res.send(500);
            }
        });
});


// Retrieve a single class based on class subject
// url:port/class/ClassToCheck
app.get('/class/:subject',(req,res)=>{
    var subject = req.params.subject;
    mysqlConnection.query('SELECT * FROM Classes WHERE subjectCourse = ?', [subject],
        (err, rows, fields)=>{
            // Print query
            if(!err) {
                if (rows.length <= 0) {
                    // No results found
                    res.send(JSON.stringify(dneResponse));
                } else {
                    res.send(rows);
                }
            }
            else {
                // Log and return server error
                console.log(err);
                res.send(500);
            }
        });
});

// Retrieve an array of classes
// url:port/classes?cls=
// Concat all 'cls' arguments into an array allowing you to pass in an array of classes
app.get('/classes',(req,res)=>{
    // Read data from API call and parse to array
    var courses = req.query.cls;

    // Create SQL Query string to include all course arguments
    var sqlString = ("('" + courses.toString().replace(",", "','") + "')");

    // Query database for classes
    mysqlConnection.query('SELECT * FROM Classes WHERE subjectCourse in ' + sqlString, null,
        (err, rows, fields)=>{
            // Print query
            if(!err) {
                if (rows.length <= 0) {
                    // API call to search for class
                    res.send("No data yet. Call Java method.");
                } else {
                    res.send(rows);
                }
            }
            else
                console.log(err);
        });
});

// Returns list of instructors that names contain "search" keyword
// Upto 5 results will be returned
app.get('/searchProfList/:search', (req,res)=>{
    var searchName = req.params.search;

    mysqlConnection.query("SELECT * FROM `Instructors` WHERE `name` LIKE \'%" + searchName + "%\' Limit 5;", null, (err, rows, fields)=>{
        if (!err) {
            if (rows.length > 0) {
                res.send(JSON.stringify({
                    success: true,
                    numResults: rows.length,
                    data: rows
                }));
            } else {
                res.send(JSON.stringify({
                    success: true,
                    numResults: 0,
                    data: null
                }));
            }
        } else {
            console.log(err);
            res.send(JSON.stringify({
                success: false,
                numResults: 0,
                data: null
            }))
        }
    })
});

// Returns list of class names that contain "search" keyword
// Upto 5 results will be returned
app.get('/searchClassList/:search', (req,res)=>{
    var searchTitle = req.params.search;

    mysqlConnection.query("SELECT * FROM `ClassList` WHERE `subjectCourse` LIKE \'%" + searchTitle + "%\' Limit 5;", null, (err, rows, fields)=>{
        if (!err) {
            if (rows.length > 0) {
                res.send(JSON.stringify({
                    success: true,
                    numResults: rows.length,
                    data: rows
                }));
            } else {
                res.send(JSON.stringify({
                    success: true,
                    numResults: 0,
                    data: null
                }));
            }
        } else {
            console.log(err);
            res.send(JSON.stringify({
                success: false,
                numResults: 0,
                data: null
            }))
        }
    })
});












