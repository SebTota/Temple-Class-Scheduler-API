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
Query entire database: `http://ip:3000/allClasses` 

Query for all sections of CLASS: `http://ip:3000/class/CLASS`

Query for all sections of CLASS1 and CLASS2: `http://ip:3000/classes?arr=CLASS1&arr=CLASS2`



