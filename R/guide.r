x <- c(1, 10, 24, 40)
y <- c("사과", "바나나", "오렌지")
z <- c(TRUE, FALSE, TRUE)

xy <- c(x, y)

income=c(100,200,150,300,900)
car = c("kia", "hyundai", "kia", "toyota", "lexus")
marriage = c(FALSE, FALSE, FALSE, TRUE, TRUE)
mydat = data.frame(income, car, marriage)

addto = function(a) {
    isum = 0
    for (i in 1:a) {
        isum = isum + i
    }
    print(isum)
}

install.packages("reshape")
library(reshape)
data(airquality)
head(airquality)
head(airquality,10)
names(airquality)
names(airquality) = tolower(names(airquality))
names(airquality)

aqm = melt(airquality, id=c("month","day"), na.rm=TRUE)
#> head(aqm)
#  month day variable value
#1     5   1    ozone    41
#2     5   2    ozone    36
#3     5   3    ozone    12
#4     5   4    ozone    18
#5     5   6    ozone    28
#6     5   7    ozone    23
a <- cast(aqm, day ~ month ~ variable)
#> a
#, , variable = ozone
#
#    month
#day    5  6   7   8  9
#  1   41 NA 135  39 96
#  2   36 NA  49   9 78
#  3   12 NA  32  16 73
#  4   18 NA  NA  78 91
#  5   NA NA  64  35 47
b <- cast(aqm, month ~ variable, mean)
#> b
#  month    ozone  solar.r      wind     temp
#1     5 23.61538 181.2963 11.622581 65.54839
#2     6 29.44444 190.1667 10.266667 79.10000
#3     7 59.11538 216.4839  8.941935 83.90323
#4     8 59.96154 171.8571  8.793548 83.96774
#5     9 31.44828 167.4333 10.180000 76.90000
c <- cast(aqm, month ~ . | variable, mean)
#> c
#$ozone
#  month    (all)
#1     5 23.61538
#2     6 29.44444
#3     7 59.11538
#4     8 59.96154
#5     9 31.44828
d <- cast(aqm, month ~ variable, mean, margins=c("grand_row","grand_col"))
#> d
#  month    ozone  solar.r      wind     temp    (all)
#1     5 23.61538 181.2963 11.622581 65.54839 68.70696
#2     6 29.44444 190.1667 10.266667 79.10000 87.38384
#3     7 59.11538 216.4839  8.941935 83.90323 93.49748
#4     8 59.96154 171.8571  8.793548 83.96774 79.71207
#5     9 31.44828 167.4333 10.180000 76.90000 71.82689
#6 (all) 42.12931 185.9315  9.957516 77.88235 80.05722
e <- cast(aqm, day~month, mean, subset=variable=="ozone")
#> e
#   day   5   6   7   8   9
#1    1  41 NaN 135  39  96
#2    2  36 NaN  49   9  78
#3    3  12 NaN  32  16  73
#4    4  18 NaN NaN  78  91
#5    5 NaN NaN  64  35  47
f <- cast(aqm, month~variable, range)
#a> f
#  month ozone_X1 ozone_X2 solar.r_X1 solar.r_X2 wind_X1 wind_X2 temp_X1 temp_X2
#1     5        1      115          8        334     5.7    20.1      56      81
#2     6       12       71         31        332     1.7    20.7      65      93
#3     7        7      135          7        314     4.1    14.9      73      92
#4     8        9      168         24        273     2.3    15.5      72      97
#5     9        7       96         14        259     2.8    16.6      63      93
