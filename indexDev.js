const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');
const cors = require('cors'); // CORS issue fix
var nodemailer = require('nodemailer'); // send e-mail
var Filter = require('bad-words'), filter = new Filter(); // Profanity filter
// E-Mail hash creation and verification without need for database
const { generateVerificationHash } = require('dbless-email-verification'); // Generate e-mail hash
const { verifyHash } = require('dbless-email-verification'); // Verify e-mail hash

let secret = 'ANC&2SwbgG&3UjDrKHeMw*NL!FBpzjJzFYT4gochT4cMCZ7Q%HS286besrQyokFZ@LZk!eoRCwN@zz4SE@TyHYxURB8TDtUxj6bzk*FSwnSTqdcipyGYdLFW';

var bcrypt = require('bcryptjs'); // Password hashing
let saltRounds = 12;

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


// Test if API is up and running
app.get('/test', (req, res) => {
    res.send({success: true, data: null});
})



app.get('/course',(req,res)=>{
    var course = req.query.title;
    mysqlConnection.query('SELECT * FROM Classes WHERE subjectCourse = ?', [course],
        (err, rows, fields)=>{
            // Print query
            if(!err) {
                if (rows.length <= 0) {
                    // Course not found
                    res.send({success: true, data: 'not found'});
                } else {
                    res.send({success: true, data: rows});
                }
            }
            else {
                // Log and return server error
                console.log(err);
                res.send({success: true, data: 'server error'});
            }
        });
});


// Returns list of instructors that names contain "search" keyword
// Upto 5 results will be returned
app.get('/searchProfList/:search', (req,res)=>{
    var searchName = req.params.search;

    let rows = null;

    mysqlConnection.query("SELECT * FROM `Instructors` WHERE `name` LIKE \'%" + searchName + "%\' Limit 5;", null, (err, rows, fields)=>{
        if (!err) {
            if (rows.length > 0) {
                res.send({
                    success: true,
                    numResults: rows.length,
                    data: rows
                });
            } else {
                res.send({
                    success: true,
                    numResults: 0,
                    data: null
                });
            }
        } else {
            console.log(err);
            res.send({
                success: false,
                numResults: 0,
                data: null
            });
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
                res.send({
                    success: true,
                    numResults: rows.length,
                    data: rows
                });
            } else {
                res.send({
                    success: true,
                    numResults: 0,
                    data: null
                });
            }
        } else {
            console.log(err);
            res.send({
                success: false,
                numResults: 0,
                data: null
            });
        }
    })
});







// Check if users e-mail is already in database
function userExists(email) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT * FROM users WHERE email = "' + email + '" LIMIT 1', null,
            (err, rows, fields) => {
                if (!err) {
                    if (rows.length <= 0) { // User not found
                        resolve (false);
                    } else { // Account exists
                        resolve (rows[0]);
                    }
                } else {
                    console.log(err);
                    resolve(false);
                }
            });
    });
}


function checkPass(email, hash, pass) {
    return new Promise((resolve, reject) => {
        resolve (bcrypt.compareSync(pass, hash));
    })
}

// Hash password and insert new user into user table
function createNewUser(email, pass) {
    return new Promise((resolve, reject) => {
        // Hash password with random salt
        let salt = bcrypt.genSaltSync(saltRounds);
        let hash = bcrypt.hashSync(pass, salt);

        // Add new user to database
        mysqlConnection.query('INSERT INTO users (email, pass, salt) VALUES (?, ?, ?)', [email, hash, salt],
            (err, rows, fields) => {
                if (!err) {
                    resolve(true);
                } else {
                    console.log(err);
                    resolve(false);
                }
            });
    });
}

function addReview(req, res, email, newAccount) {
    let instructor = decodeURIComponent(req.query.instructor);
    let course = decodeURIComponent(req.query.course);
    let rating = decodeURIComponent(req.query.rating);
    let difficulty = decodeURIComponent(req.query.difficulty);
    let review = decodeURIComponent(req.query.review);
    let takeAgain = decodeURIComponent(req.query.takeAgain);

    return new Promise((resolve, reject)=> {
        // Add new review to database
        mysqlConnection.query('INSERT INTO reviews (instructor, course, rating, difficulty, reviewText, takeAgain, hidden, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [instructor, course, rating, difficulty, review, (takeAgain === 'true'), filter.isProfane(review), email],
            (err, rows, fields) => {
                if (!err) {
                    if (newAccount) {
                        res.send({success: true, data:'review added - new account'});
                    } else {
                        res.send({success: true, data:'review added'});
                    }
                    resolve(true);
                } else {
                    console.log(err);
                    resolve(false);
                }
            });
    });
}


// Add a new professor review
// Return data values
//      'profanity', 'review added', 'review not added'
app.get('/addReview', async function (req, res) {
    let email = decodeURIComponent(req.query.email);
    let pass = decodeURIComponent(req.query.pass);

    console.log(email);

    if (email !== "") {// check if e-mail address was provided
        let user = await userExists(email);
        if (user !== false) {
            // User exists in database. Check password
            if (await checkPass(email, user.pass, pass)) { // email provided, stored password hash, password provided
                // Password matches database
                await addReview(req, res, email, false);
            } else {
                // Password is not correct
                res.send({success: true, data: "incorrect password"});
            }
        } else {
            // Create new user
            if (await createNewUser(email, pass)) {
                if (await addReview(req, res, email, true)) {
                    sendEmail(email);
                }
            }
        }
    }
});








//--- e-mail verification---//
"use strict";
// async..await is not allowed in global scope, must use a wrapper
async function sendEmail(emailAddress) {

    let verificationHash = generateVerificationHash(emailAddress, secret, 6); // Create a hash that expires in 6 minutes
    let verificationLink =  "http://localhost:3000/verifyEmail/?&email=" + emailAddress + "&verificationHash=" + verificationHash;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "email-smtp.us-east-1.amazonaws.com",
        port: 465,
        secure: true,
        auth: {
            user: "AKIA5ZSACPIXE7ZXTC7M",
            pass: "BNfaQvlF8aeyfFfMWodQXQX14Kh4GQh1kSQomnE1xw6L",
        },
    });

    await transporter.sendMail({
        from: '"no-reply" <no-reply@sebtota.com>', // sender address
        to: emailAddress, // list of receivers
        subject: "Review Verification", // Subject link
        html: '<b>Click link below to verify review.</b><br><a href="' + verificationLink + '">Click Here</a>', // html body
    });

}


// Verify users email using unique hash
app.get('/verifyEmail', (req, res) => {
    let email = req.query.email;
    let verificationHash = req.query.verificationHash;

    let isEmailVerified = verifyHash(verificationHash, email, secret);

    if (isEmailVerified) {
        // Update account to show verified
        mysqlConnection.query('UPDATE users SET verified = ? WHERE email = ?', [true, email],
            (err, rows, fields) => {
                if (!err) {
                    res.send("E-mail verification complete. You may close this tab.");
                } else {
                    // my-sql error
                    res.send('Server error');
                }
            });
    } else {
        res.send("That verification link looks a little funny");
    }

});