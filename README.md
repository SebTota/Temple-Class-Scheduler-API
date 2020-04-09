## Temple Class Scheduler Database API

Node.js application designed to interact with the
Temple Class Scheduler database. 

#### Installation
Set the following environmental variables:

* `AWS_URL` - AWS RDS database URL

* `AWS_USER` - Database username

* `AWS_PASS` - Database password

Install Node.js: https://nodejs.org/en/download/

Install required packages:
``` bash
npm instlal mysql
npm install express
npm install body-parser
```

#### Usage
##### Server
Run application on port 3000

`node index.js`

##### API examples
Base url: `https://url/ip:3000`

Query entire database: `/allClasses` 

Query to see if class exists: `/checkClass?cls=CLASS`

Query for all sections of CLASS: `/class/CLASS`

Query for all sections of CLASS1 and CLASS2: `/classes?cls=CLASS1&cls=CLASS2`



