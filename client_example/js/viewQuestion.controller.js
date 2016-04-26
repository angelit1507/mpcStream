/**
 * Created by Angel on 4/27/2016.
 */
app.controller('viewQuestion.controller', viewQuestionController);
viewQuestionController.$inject = ['$scope','data']
function viewQuestionController($scope, data) {
    $scope.question = {};
    if(data.question){
        $scope.question = data.question;
    }
}