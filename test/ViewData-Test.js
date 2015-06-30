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
            policyKey: 'persistent'
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


}


//prepare the file blob to be uploaded
readSampleModelFile(modelPath);







describe('ViewData Client test suite',function(){

	this.timeout(50000); //50 seconds

	var viewDataClient = new Autodesk.ADN.Toolkit.ViewData.AdnViewDataClient(
                   'https://developer.api.autodesk.com',
                   'http://still-spire-1606.herokuapp.com/api/rawtoken');


	it('should return persitent bucket detail', function(done){

		
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






	it('should create a transient bucket', function(done){
		

        viewDataClient.onInitialized(function(){

         	//a random bucket name
			var temp_bucket_name = bucket_name + new Date().getTime().toString();
			
			var bucketCreationData = {
	            bucketKey: temp_bucket_name,
	            servicesAllowed: {},
	            policyKey: 'transient'
	        }

			viewDataClient.createBucketAsync(
	            bucketCreationData,
	            //onSuccess
	            function (response) {
	                console.log('Bucket creation successful:');
	                console.log(response);
	                
	                expect(response).to.have.property('bucketKey');
	                expect(response.bucketKey).to.equal(temp_bucket_name);

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

	it('should upload file to persistent bucket', function(done){

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
                	expect(response).to.have.property('objectKey');
                	expect(response.objectKey).to.equal(filename);
                	expect(response.file.size).to.equal(file.size);

                	var expectedFileId = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;
                	expect(response.objectId).to.equal(expectedFileId);

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

			console.log(regRes);
			expect(regRes).to.have.property('Result');
			expect(['Success','Created']).to.include(regRes.Result);
			done();
		});
	});


	it('should get thumbnail',function(done){

		viewDataClient.onInitialized(function(){


			var fileid = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;

			viewDataClient.getThumbnailAsync(fileid,
				function(base64){

					//console.log(base64);
					expect(base64).to.have.length.above(0);

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


	it('getViewableAsync - status', function(done){
		viewDataClient.onInitialized(function(){

			var fileid = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;

			viewDataClient.getViewableAsync(fileid,
				function(viewable){
					console.log(viewable);

					expect(viewable).to.have.property('urn');
					expect(viewable.urn).to.equal(viewDataClient.toBase64(fileid));
					expect(viewable).to.have.property('progress');
					expect(viewable).to.have.property('success');
					expect(viewable.success).to.contain('%');
				
					done();
				},
				function(error){
					//make test fail
				    expect(1).to.equal(0);
				        
				    done();
			

				},
				'status',
				null //guid
				);

			
		});

		

	});

	it('getViewableAsync - all', function(done){
		viewDataClient.onInitialized(function(){

			var fileid = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;

			viewDataClient.getViewableAsync(fileid,
				function(viewable){
					console.log(viewable);

					expect(viewable).to.have.property('urn');
					expect(viewable.urn).to.equal(viewDataClient.toBase64(fileid));
					expect(viewable).to.have.property('progress');
					expect(viewable).to.have.property('success');
					expect(viewable.success).to.contain('%');
				
					//expect(viewable).to.have.property('script');
					//expect(viewable.script).to.equal('viewing-dwf-lmv');
					done();
				},
				function(error){
					//make test fail
				    expect(1).to.equal(0);
				        
					done();

				},
				'all',
				null //guid
				);

			
		});

		

	});



	xit('getSubItemsWithProperties', function(done){
		viewDataClient.onInitialized(function(){

			var fileid = 'urn:adsk.objects:os.object:' + bucket_name + '/' + filename;

			var properties = {
				urn : '',
				progress : '',
				script : '',
				role : ''

			};
			//how is it supposed to use for "properties"? 
			//Should it be an array like  ['urn','progress','script','role'] ? 
			viewDataClient.getSubItemsWithProperties(fileid,
					properties,
					function(items){
						console.log(items);

						//expect(items).contains('text to find');

						// expect(items).to.have.property('urn');
						// expect(items.urn).to.equal(viewDataClient.toBase64(fileid));
						// expect(items).to.have.property('progress');
						// expect(items).to.have.property('success');
						// expect(items.success).to.contain('%');
					
						// expect(viewable).to.have.property('script');
						// expect(viewable.script).to.equal('viewing-dwf-lmv');
						
						done();
					},
					function(error){
						//make test fail
					    expect(1).to.equal(0);
					        
						done();

					},
					'all',
					null //guid
				);

			
		});

		

	});


	

});