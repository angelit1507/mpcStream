/**
 * Created by Angel on 4/21/2016.
 */
app.controller('addImage.controller', addImageController);
addImageController.$inject = ['$scope', 'data']
function addImageController($scope, data) {
    $scope.imageUrl = '';
    $scope.videoIds = [];
    if (data.oldData) {
        $scope.imageUrl = data.oldData.imageUrl;
        $scope.videoIds = data.oldData.videoIds;
    }
    $scope.addVideo = function () {
        $scope.videoIds.push('');
    }
    $scope.removeVideo = function ($index) {
        $scope.videoIds.splice($index, 1);
    }
    $scope.updateVideoId = function (video, $index) {
        $scope.videoIds[$index] = video;
    }
    $scope.save = function () {
        if ($scope.form.$invalid) {
            alert('Link ảnh or video ko hợp lệ');
            return;
        }
        $scope.$close({
            imageUrl: $scope.imageUrl,
            videoIds: $scope.videoIds
        });
    }
}