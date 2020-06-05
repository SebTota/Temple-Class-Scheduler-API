const production = false;
const url = "http://localhost";
const port = 4001;

const mysql = require('mysql');
const express = require('express');
var app = express();
const https = require('https');
const fs = require('fs');
const bodyparser = require('body-parser');
const cors = require('cors'); // CORS issue fix
var nodemailer = require('nodemailer'); // send e-mail
var Filter = require('bad-words'), filter = new Filter(); // Profanity filter
// E-Mail hash creation and verification without need for database
const { generateVerificationHash } = require('dbless-email-verification'); // Generate e-mail hash
const { verifyHash } = require('dbless-email-verification'); // Verify e-mail hash

var bcrypt = require('bcryptjs'); // Password hashing
let saltRounds = 12;

const smtpHost = process.env.SMTP_HOST;
const smtpEmail= process.env.SMTP_EMAIL;
const smtpPass = process.env.SMTP_PASS;
const emailSecret = process.env.EMAIL_SECRET;

app.use(cors({origin: '*'})); // Adds CORS header to allow cross origin resource sharing
app.use(bodyparser.json());

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


if (production === false) {
    // Testing server
    app.listen(port, ()=>console.log("No error. Express server running"));
} else {
    // Create production server with SSL certs
    https.createServer({
        key: fs.readFileSync('./key.pem'),
        cert: fs.readFileSync('./cert.pem')
    }, app).listen(port);
}

// Print endpoint
console.log(url + ":" + port.toString(10));


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
    return new Promise(function(resolve, reject){
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
                    resolve (false);
                }
            });
    });


}


function checkPass(req, res, email, hash, pass) {
    return (bcrypt.compareSync(pass, hash));
}


// Hash password and insert new user into user table
function createNewUser(email, pass) {
    return new Promise(function(resolve, reject){
        // Hash password with random salt
        let salt = bcrypt.genSaltSync(saltRounds);
        let hash = bcrypt.hashSync(pass, salt);

        // Add new user to database
        mysqlConnection.query('INSERT INTO users (email, pass, salt) VALUES (?, ?, ?)', [email, hash, salt],
            (err, rows, fields) => {
                if (!err) {
                    resolve (true);
                } else {
                    console.log(err);
                    resolve (false);
                }
            });
    });
}


function addReview(req, res, email, newAccount) {
    return new Promise(function(resolve, reject){
        let instructor = decodeURIComponent(req.query.instructor);
        let course = decodeURIComponent(req.query.course);
        let rating = decodeURIComponent(req.query.rating);
        let difficulty = decodeURIComponent(req.query.difficulty);
        let review = decodeURIComponent(req.query.review);
        let takeAgain = decodeURIComponent(req.query.takeAgain);

        // Check if user already left a review for specified professor
        // Don't add new review if true
        mysqlConnection.query('SELECT * FROM reviews WHERE instructor = ? AND email = ? LIMIT 1', [instructor, email], (err, rows, fields) => {
            if (!err) {
                if (rows.length > 0) {
                    // User already reviewed this prof. DON'T ADD REVIEW
                    res.send({success: true, data:'review not added - user already reviewed prof'});
                    return;
                } else {
                    // Add new review to database
                    mysqlConnection.query('INSERT INTO reviews (instructor, course, rating, difficulty, reviewText, takeAgain, hidden, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [instructor, course, rating, difficulty, review, (takeAgain === 'true'), filter.isProfane(review), email],
                        (err, rows, fields) => {
                            if (!err) {
                                if (newAccount) {
                                    resolve(res.send({success: true, data:'review added - new account'}));
                                } else {
                                    resolve(res.send({success: true, data:'review added'}));
                                }
                            } else {
                                console.log(err);
                            }
                        });
                }
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
app.get('/addReview', function (req, res) {
    let email = decodeURIComponent(req.query.email);
    let pass = decodeURIComponent(req.query.pass);

    // Make sure user is using temple email
    if (!email.includes('@temple.edu')) {
        res.send({success: true, data: 'Invalid email'});
    } else {
        if (email !== "") {// check if e-mail address was provided
            userExists(email).then(user => {
                console.log(user);

                if (user !== false) {
                    // User exists in database. Check password
                    if (checkPass(req, res, email, user.pass, pass)) { // email provided, stored password hash, password provided
                        // Password matches database
                        console.log('Password matches');
                        addReview(req, res, email, false);
                    } else {
                        // Password is not correct
                        res.send({success: true, data: "incorrect password"});
                    }
                } else {
                    // Create new user
                    console.log('creating new user');
                    createNewUser(email, pass).then(userCreated => {
                        console.log(userCreated);
                        if (userCreated){
                            if (addReview(req, res, email, true)) {
                                sendVerificationEmail(email);
                            }
                        }
                    })
                }
            })
        }
    }
});


//--- e-mail verification---//
"use strict";
// async..await is not allowed in global scope, must use a wrapper
async function sendVerificationEmail(emailAddress) {
    let verificationHash = generateVerificationHash(emailAddress, emailSecret, 6); // Create a hash that expires in 6 minutes
    let purgeLink = url + ":" + port.toString(10) + "/deleteAccount/?&email=" + emailAddress + "&verificationHash=" + verificationHash;
    let verificationLink = url + ":" + port.toString(10) + "/verifyEmail/?&email=" + emailAddress + "&verificationHash=" + verificationHash;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        auth: {
            user: smtpEmail,
            pass: smtpPass,
        },
    });

    await transporter.sendMail({
        from: '"no-reply" <' + smtpEmail + '>', // sender address
        to: emailAddress, // list of receivers
        subject: "Review Verification", // Subject link
        html: '<b>Click link below to verify review.</b><br><a href="' + verificationLink + '">Verify email</a><br><br>' +
        '<b>Got this email by accident or want to remove your account? Click link below.</b><br>' +
        '<br><a href="' + purgeLink + '">Delete Account</a>', // html body
    });
}




async function verifyEmailHash(req) {
    return new Promise(function(resolve, reject){
        let email = decodeURIComponent(req.query.email);
        let verificationHash = decodeURIComponent(req.query.verificationHash);

        resolve(verifyHash(verificationHash, email, emailSecret));
    });
}


// Verify users email using unique hash
app.get('/verifyEmail', async function (req, res) {
    const isEmailVerified = await verifyEmailHash(req);

    if (isEmailVerified) {
        let email = decodeURIComponent(req.query.email);
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


app.get('/resendVerificationEmail', (req, res) => {
    let email = decodeURIComponent(req.query.email);

    mysqlConnection.query('SELECT * FROM users WHERE email = "' + email + '" LIMIT 1', null,
        (err, rows, fields) => {
            if (!err) {
                if (rows.length <= 0) { // User not found
                    res.send({success: true, data: "Email sent if user exists"});
                } else { // Account exists
                    sendVerificationEmail(email);
                    res.send({success: true, data: "Email sent if user exists"});
                }
            } else {
                console.log(err);
                res.send({success: true, data: "Something broke!"});
            }
        });
});

app.get('/deleteAccount', async function (req, res) {
    const isEmailVerified = await verifyEmailHash(req);
    let email = decodeURIComponent(req.query.email);

    if (isEmailVerified) {
        // Update account to show verified
        mysqlConnection.query('DELETE users, reviews FROM users INNER JOIN reviews WHERE users.email = ?', [email],
            (err, rows, fields) => {
                if (!err) {
                    res.send("Account deleted if it existed.");
                } else {
                    // my-sql error
                    console.log(err)
                    res.send('Server error');
                }
            });
    } else {
        res.send("Account deleted if it existed.");
    }
});


// app.get('/passwordReset')