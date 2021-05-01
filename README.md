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
npm instlal
```

#### Usage
##### Server
Run application on port 4001

`node index.js`

##### API examples
Base url: `https://url/ip:4001`

Return entire database: `/allClasses` 

Return if class exists: `/checkClass?cls=CLASS`

Return all sections of CLASS: `/class/CLASS`

Return all sections of CLASS1 and CLASS2: `/classes?cls=CLASS1&cls=CLASS2`

Return all instructors containing the keyword search: `/searchProfList/search`

Return all classes containing the keyword search: `/searchClassList/search`

