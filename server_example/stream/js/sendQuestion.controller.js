/**
 * Created by Angel on 4/26/2016.
 */
app.controller('sendQuestion.controller', sendQuestionController);
sendQuestionController.$inject = ['$scope', 'data', 'userService', 'localStorageService', 'toaster']
function sendQuestionController($scope, data, userService, localStorageService,toaster) {
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
            toaster.pop('error', 'Nhập đầy đủ thông tin!');
            return;
        }
        $scope.isDisabled = true;
        userService.sendQuestion($scope.question)
            .success(function (rs) {
                if(rs.code){
                    toaster.pop('error', 'Lỗi khi gửi câu hỏi!');
                    return;
                }
                toaster.pop('success', 'Gửi câu hỏi thành công!');
                $scope.$close({});
            })
    }
}