/**
 * Created by Angel on 4/29/2016.
 */
app.controller('listQuestion.controller', listQuestionController);
listQuestionController.$inject = ['$scope', 'userService', '$confirm', 'toaster']
function listQuestionController($scope, userService, $confirm, toaster) {
    $scope.questions = [];
    $scope.viewQuestion = function (question) {
        $confirm({
            question: question
        }, {
            controller: 'viewQuestion.controller',
            templateUrl: 'views/viewQuestion.html'
        }).then(function (result) {
        })
    }
    $scope.deleteQuestion = function (question, $index) {
        userService.deleteQuestion(question.Stream_QuestionID)
            .success(function () {
                $scope.questions.splice($index, 1);
                toaster.pop('success', 'đã xóa câu hỏi');
            }).error(function () {
            toaster.pop('error', 'Lỗi khi xóa câu hỏi');
        });
    }
    $scope.setStreamQuestion = function (question) {
        $scope.$close(question);
    }
    function getListQuestions() {
        userService.listQuestions({}).success(function (result) {
            result.forEach(function (item) {
                $scope.questions.push(item);
            });
        })
    }

    getListQuestions();
}