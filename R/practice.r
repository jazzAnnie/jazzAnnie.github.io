data(mtcars)
head(mtcars)

install.packages("ggplot2")
library(ggplot2)
# x축은 wt, y축은 mpg, 데이터는 hp인데 컬러 포인트로 보임
p <- qplot(wt, mpg, colour=hp, data=mtcars)
# y축의 좌료는 0부터 40까지
p + coord_cartesian(ylim=c(0, 40))
# hp의 범위는 100부터 300까지 
p + scale_colour_continuous(breaks=c(100, 300))
# 범례는 색깔바로 표시
p + guides(colour="colourbar")


m <- mtcars[1:10, ]
# 1부터 10까지 데이터를 추출해서 p라는 그래프에 m을 적용한다.
p %+% m