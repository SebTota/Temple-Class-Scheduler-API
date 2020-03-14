const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');

app.use(bodyparser.json());

// Set all variables to connect to AWS database
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
app.get('/classes',(req,res)=>{
    // Log all entries in Classes table as array
    mysqlConnection.query('SELECT * FROM Classes',(err, rows, fields)=>{
        // Print query
        if(!err)
            res.send(rows); // Show array at localhost:port
            // console.log(rows); // Log all entries in console
        else
            console.log(err);
    });
});

// Retrieve a single class based on class subject
app.get('/classes/:subject',(req,res)=>{
    /*
    Note:
    Node also allows app.get('/classes/subject',(req,res)=>{
    var subject = req.query.subject;
    where subject is a required key in the GET request
    */
    var subject = req.params.subject;
    mysqlConnection.query('SELECT * FROM Classes WHERE subject = ?', [subject],(err, rows, fields)=>{
        // Print query
        if(!err) {
            if (rows.length <= 0) {
                // API call to search for class
                res.send("No data yet. Call Java method.");
            } else {
                res.send(rows);
            }
            // console.log(rows); // Log all entries in console
        }
        else
            console.log(err);
    });
});
