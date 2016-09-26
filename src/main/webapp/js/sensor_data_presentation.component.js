angular.
module('sensorDataPresentation').
  component('sensorDataPresentation', {
    templateUrl: 'html/sensor_data_presentation_view.template.html',
    controller: function SensorDataPresentationController($scope) {
    	$scope.list = function() {
    		var self = this;
    	    alert("test");
    	    gapi.client.analysisEndpoint.getMyProbeEntries({'amount' : 50}).execute(function(resp) {
    		self.probes = resp.probes;
    	    $scope.$apply();
    		});
    	}
    }
  });
  

  function cont()	{
	  $ctrl.list();
  };
  
  function init() {
		gapi.client.load('analysisEndpoint', 'v1', cont(), '//' + window.location.host + '/_ah/api');
	};

	/*function getSample() {
		gapi.client.analysisEndpoint.getMyProbeEntries({
			'amount' : 50
		}).execute(function(resp) {
			if (!resp.code) {
				resp.entries = resp.entries || [];
				printProbes(resp.entries);
			}
		});
	}*/

	/*function printProbes(probes) {
		var tbody = document.getElementById("probeList");

		for (var i = 0; i < probes.length; i++) {
			var row = document.createElement("tr");

			var userCell = document.createElement("td");
			userCell.innerHTML = probes[i].userID;
			row.appendChild(userCell);

			var timestampCell = document.createElement("td");
			timestampCell.innerHTML = probes[i].timestamp;
			row.appendChild(timestampCell);

			var probeTypeCell = document.createElement("td");
			probeTypeCell.innerHTML = probes[i].probeType;
			row.appendChild(probeTypeCell);

			var sensorDataCell = document.createElement("td");
			sensorDataCell.innerHTML = probes[i].sensorData;
			row.appendChild(sensorDataCell);

			tbody.appendChild(row);
		}
*/