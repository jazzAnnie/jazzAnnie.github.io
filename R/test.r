stat_function <- function(x) {
    x_mean = mean(x)
    x_sd = sd(x)
    x_min = min(x)
    x_max = max(x)
    x_summary = list(x_mean=x_mean, x_sd=x_sd, x_min=x_min, x_max=x_max)
    return(x_summary)
}

stat_function(100)