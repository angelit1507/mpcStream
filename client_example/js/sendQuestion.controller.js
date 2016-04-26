/**
 * Created by Angel on 4/26/2016.
 */
app.controller('sendQuestion.controller', sendQuestionController);
sendQuestionController.$inject = ['$scope', 'data', 'userService', 'localStorageService']
function sendQuestionController($scope, data, userService, localStorageService) {
    var user = localStorageService.get('user');
    if (!user || !user.UserID) {
        alert('please login!')
        $scope.cancel();
        return;
    }
    $scope.question = {
        UserID: user.UserID
    };

    $scope.save = function () {
        if ($scope.form.$invalid) {
            alert('Nhập đầy đủ thông tin!');
            return;
        }
        userService.sendQuestion($scope.question)
            .success(function () {
                $scope.$close({});
            })
    }
}