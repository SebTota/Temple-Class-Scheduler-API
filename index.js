const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');

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

// Retrieve a single class based on class subject
// ip:port//class/CLASS
app.get('/class/:subject',(req,res)=>{
    var subject = req.params.subject;
    mysqlConnection.query('SELECT * FROM Classes WHERE subjectCourse = ?', [subject],
        (err, rows, fields)=>{
        // Print query
        if(!err) {
            if (rows.length <= 0) {
                // No results found
                res.send(noDataResponse);
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
// ip:port/classes?arr=
// Concat all 'arr' arguments into an array allowing you to pass in an array of classes
app.get('/classes',(req,res)=>{
    // Read data from API call and parse to array
    var courses = req.query.arr;

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
