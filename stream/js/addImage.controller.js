/**
 * Created by Angel on 4/21/2016.
 */
app.controller('addImage.controller', addImageController);
addImageController.$inject = ['$scope','data']
function addImageController($scope, data) {
    $scope.imageUrl = '';
    $scope.videoId =  '';
    if(data.oldData){
        $scope.imageUrl = data.oldData.imageUrl;
        $scope.videoId = data.oldData.videoId;
    }
    $scope.save = function () {
        if ($scope.form.$invalid) {
            alert('Link ảnh or video ko hợp lệ');
            return;
        }
        $scope.$close({
            imageUrl: $scope.imageUrl,
            videoId: $scope.videoId
        });
    }
}