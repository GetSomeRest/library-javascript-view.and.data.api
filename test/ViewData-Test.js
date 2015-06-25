var expect = chai.expect;
var bucket_name = 'view-data-js-lib-test';
var modelPath = 'sampleFiles/Drill.dwfx';
var filename = 'Drill.dwfx'

function createPersistantBucket(bucket_name){

	var viewDataClient = new Autodesk.ADN.Toolkit.ViewData.AdnViewDataClient(
                   'https://developer.api.autodesk.com',
                   'http://still-spire-1606.herokuapp.com/api/rawtoken');

	viewDataClient.onInitialized(function(){

					
		var bucketCreationData = {
            bucketKey: bucket_name,
            servicesAllowed: {},
            policy: 'persistent'
        }

		viewDataClient.createBucketAsync(
            bucketCreationData,
            //onSuccess
            function (response) {
                console.log('Bucket creation successful:');
                console.log(response);
                
  
            },
            //onError
            function (error) {
                console.log('Bucket creation failed:');
                console.log(error);
                console.log('Exiting ...');
            }
        );

	});

}


var sampleModelFileObj ;
function readSampleModelFile(filePath){
	
	// Create XHR, Blob and FileReader objects
    var xhr = new XMLHttpRequest(),
        blob;
 
    xhr.open("GET", filePath, true);
    // Set the responseType to arraybuffer. "blob" is an option too, rendering manual Blob creation unnecessary, but the support for "blob" is not widespread enough yet
    xhr.responseType = "arraybuffer";
 
    xhr.addEventListener("load", function () {
        if (xhr.status === 200) {
            // Create a blob from the response
            blob = new Blob([xhr.response], {type: 'application/octet-binary'});
 			sampleModelFileObj =  blob;
            
        }
    }, false);
    // Send XHR
    xhr.send();

    // xhr.open('GET',filePath,false); //in sync way
    // xhr.responseType = "arraybuffer";
    // xhr.send();
    // var ab = xhr.response; //array buffer
    // blob = new Blob(ab, {type: 'application/octet-binary'}); // pass a useful mime type here;
    // return blob;



}


//prepare the file blob to be uploaded
readSampleModelFile(modelPath);







describe('ViewData Client test suite',function(){

	this.timeout(50000); //50 seconds

	var viewDataClient = new Autodesk.ADN.Toolkit.ViewData.AdnViewDataClient(
                   'https://developer.api.autodesk.com',
                   'http://still-spire-1606.herokuapp.com/api/rawtoken');


	it('should return bucket detail', function(done){

		
		viewDataClient.onInitialized(function(){

			viewDataClient.getBucketDetailsAsync(
			    bucket_name,
			    //onSuccess
			    function (bucketResponse) {
			        console.log('Bucket details successful:');
			        console.log(bucketResponse);
			        
			        expect(bucketResponse).to.have.property('key');
			        expect(bucketResponse.key).to.equal(bucket_name);

			        done();
			    },
			    //onError
			    function (error) {
			        console.log("Bucket doesn't exist");
			        //console.log("Attempting to create...");
			        createPersistantBucket(bucket_name);
			        
			        //make test fail
			        expect(1).to.equal(0);
			        
			        done();  
			    });

		});

	});






	it('should create a bucket', function(done){
		

        viewDataClient.onInitialized(function(){

         	//a random bucket name
			bucket_name = bucket_name + new Date().getTime().toString();
			
			var bucketCreationData = {
	            bucketKey: bucket_name,
	            servicesAllowed: {},
	            policy: 'transient'
	        }

			viewDataClient.createBucketAsync(
	            bucketCreationData,
	            //onSuccess
	            function (response) {
	                console.log('Bucket creation successful:');
	                console.log(response);
	                
	                expect(response).to.have.property('key');
	                expect(response.key).to.equal(bucket_name);

	                done();
	            },
	            //onError
	            function (error) {
	                console.log('Bucket creation failed:');
	                console.log(error);
	                console.log('Exiting ...');
	               

	               	done();
	            });


         });

	});

	it('should upload file', function(done){

		viewDataClient.onInitialized(function(){


	
			//The File interface is based on Blob, 
			//inheriting blob functionality and expanding it to support files on the user's system.
			//https://developer.mozilla.org/en-US/docs/Web/API/Blob 
		

			var file = sampleModelFileObj;

			viewDataClient.uploadFileAsync(
                file,
                bucket_name,
                filename,//file.name,
                function(response){
                	console.log(response);
                	expect(response).to.have.property('file');
                	expect(response.file.size).to.equal(file.size);
                	expect(response.objects[0].key).to.equal(filename);

                	var expectedFileId = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;
                	expect(response.objects[0].id).to.equal(expectedFileId);

                	done();
                },
                function(error){

                	//make test fail
			        expect(1).to.equal(0);
			        
			        done();  
                }
            );

		});

	});


	it('should register model for translation', function(done){

		viewDataClient.onInitialized(function(){

			var fileid = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;


			var regRes = viewDataClient.register(fileid);

			expect(regRes).to.have.property('Result');
			expect(regRes.Result).to.equal('Success');

			done();
		});
	});


	xit('should get thumbnail',function(done){

		viewDataClient.onInitialized(function(){


			var fileid = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;

			viewDataClient.getThumbnailAsync(fileid,
				function(base64){

					console.log(base64);
					expect(base64).to.contain('');

					done();
				},
				function(error){
					//make test fail
				    expect(1).to.equal(0);
				        
				    done(); 

				},
				150,
				150,
				null
			);


		});

	});


	xit('getViewableAsync', function(done){
		viewDataClient.onInitialized(function(){


			done();
		});

	});

	

});