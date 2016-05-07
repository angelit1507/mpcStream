/**
 * Created by Angel on 5/7/2016.
 */
app.controller('listStreamSchedules.controller', listStreamSchedulesController);
listStreamSchedulesController.$inject = ['$scope', 'userService', '$confirm', 'toaster']
function listStreamSchedulesController($scope, userService, $confirm, toaster) {
    $scope.data = [];
    $scope.schedule = {};
    $scope.viewSchedule = function (item) {
        $confirm({
            question: question
        }, {
            controller: 'viewQuestion.controller',
            templateUrl: 'views/viewQuestion.html'
        }).then(function (result) {
        })
    }
    $scope.delete = function (item, $index) {
        userService.deleteSchedule(item.Stream_ScheduleID)
            .success(function () {
                $scope.data.splice($index, 1);
                toaster.pop('success', 'Xóa thành công');
            }).error(function () {
            toaster.pop('error', 'Lỗi khi xóa');
        });
    }
    $scope.setStreamQuestion = function (question) {
        $scope.$close(question);
    }
    function getListSchedules() {
        $scope.data = [];
        userService.listSchedules({}).success(function (result) {
            result.forEach(function (item) {
                $scope.data.push(item);
            });
        })
    }
    $scope.options = {
        minDate: new Date(),
        showWeeks: true
    };
    $scope.isAdmin = userService.isAdmin;
    $scope.time = new Date();
    $scope.changed = function () {
        if(!$scope.schedule.StreamTime)
            $scope.schedule.StreamTime = new Date();
        $scope.schedule.StreamTime.setHours($scope.time.getHours());
        $scope.schedule.StreamTime.setMinutes($scope.time.getMinutes());
    }
    $scope.save = function () {
        if ($scope.form.$invalid) {
            toaster.pop('error', 'Nhập đầy đủ thông tin!');
            return;
        }
        if(!$scope.schedule.StreamTime || $scope.schedule.StreamTime<=new Date()){
            toaster.pop('error', 'Thời gian ko hợp lệ!');
            return;
        }
        $scope.isDisabled = true;
        userService.addSchedule($scope.schedule)
            .success(function (rs) {
                $scope.isDisabled = false;
                if(rs.code){
                    toaster.pop('error', 'Lỗi khi lưu!');
                    return;
                }
                toaster.pop('success', 'Thêm lịch stream thành công!');
                $scope.schedule = {};
                getListSchedules();
            })
    }
    getListSchedules();
}