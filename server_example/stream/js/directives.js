
app.directive('errSrc', function () {
    var errSrc = {
        link: function postLink(scope, iElement, iAttrs) {
            iElement.bind('error', function () {
                if (iAttrs.errHide)
                    $(iElement).hide();
                else
                    angular.element(this).attr("src", iAttrs.errSrc);
            });
        }
    }
    return errSrc;
});



app.directive('countdown', ['Util', '$interval', function (Util, $interval) {
    return {
        restrict: 'A',
        scope: {
            date: '@'
        },
        link: function (scope, element) {
            var future = new Date(scope.date)
            $interval(function () {
                diff = Math.floor(future.getTime() - new Date().getTime()) / 1000
                $(element).html(Util.dhms(diff, 1000));
            }, 1000);
        }
    }
}]);





app.directive("fileread", [function () {
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                var reader = new FileReader();
                reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                        scope.fileread = loadEvent.target.result;
                    });
                }
                reader.readAsDataURL(changeEvent.target.files[0]);
            });
        }
    }
}]);