import React, { useState } from 'react';
import { Stack, Box } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper';
import TopPropertyCard from './TopPropertyCard';
import { PropertiesInquiry } from '../../types/property/property.input';
import { Property } from '../../types/property/property';
import { useMutation, useQuery } from '@apollo/client';
import { T } from '../../types/common';
import { GET_PROPERTIES } from '../../../apollo/user/query';
import { LIKE_TARGET_PROPERTY } from '../../../apollo/user/mutation';
import { Message } from '../../enums/common.enum';
import { sweetMixinErrorAlert, sweetTopSmallSuccessAlert } from '../../sweetAlert';

interface TopPropertiesProps {
	initialInput: PropertiesInquiry;
}

const TopProperties = (props: TopPropertiesProps) => {
	const { initialInput } = props;
	const device = useDeviceDetect();
	const [topProperties, setTopProperties] = useState<Property[]>([]);

	/** APOLLO REQUESTS **/
	
	const [likeTargetProperty] = useMutation(LIKE_TARGET_PROPERTY); 

	/** APOLLO SO‘ROVLAR **/
    const {
      loading: getPropertiesLoading,   // Yuklanish jarayoni
      data: getPropertiesData,         // Olingan ma’lumotlar
      error: getPropertiesError,       // Xatolik bo‘lsa
      refetch: getPropertiesRefetch,   // Qayta so‘rov yuborish
    } = useQuery(GET_PROPERTIES, {
      fetchPolicy: 'cache-and-network',   // Kesh va tarmoqdan foydalanish siyosati
      variables: { input: initialInput }, // Boshlang‘ich parametrlar
      notifyOnNetworkStatusChange: true,  // Tarmoq holati o‘zgarsa xabar berish
      onCompleted: (data: T) => {
        setTopProperties(data?.getProperties?.list); // Eng yuqori propertylarni o‘rnatish
      },
    });

	/** HANDLERLAR **/
const LikePropertyHandler = async (user: T, id: string) => {
  try {
    if (!id) return; // Agar id bo‘lmasa, funksiyani to‘xtatish
    if (!user._id) throw new Error(Message.NOT_AUTHENTICATED); // Agar user._id bo‘lmasa, autentifikatsiya xatosi chiqarish

    await likeTargetProperty({
      variables: { input: id }, // Mutatsiyaga id yuborish
    });
    await getPropertiesRefetch({ input: initialInput }); // Ma’lumotlarni qayta so‘rov qilish

    await sweetTopSmallSuccessAlert('success', 800); // Muvaffaqiyatli alert ko‘rsatish
  } catch (err: any) {
    console.log('XATO, likePropertyHandler:', err.message); // Konsolda xatoni chiqarish
    sweetMixinErrorAlert(err.message).then(); // Xato alert ko‘rsatish
  }
};


	if (device === 'mobile') {
		return (
			<Stack className={'top-properties'}>
				<Stack className={'container'}>
					<Stack className={'info-box'}>
						<span>Top properties</span>
					</Stack>
					<Stack className={'card-box'}>
						<Swiper
							className={'top-property-swiper'}
							slidesPerView={'auto'}
							centeredSlides={true}
							spaceBetween={15}
							modules={[Autoplay]}
						>
							{topProperties.map((property: Property) => {
								return (
									<SwiperSlide className={'top-property-slide'} key={property?._id}>
										<TopPropertyCard property={property} likePropertyHandler={LikePropertyHandler}/>
									</SwiperSlide>
								);
							})}
						</Swiper>
					</Stack>
				</Stack>
			</Stack>
		);
	} else {
		return (
			<Stack className={'top-properties'}>
				<Stack className={'container'}>
					<Stack className={'info-box'}>
						<Box component={'div'} className={'left'}>
							<span>Top properties</span>
							<p>Check out our Top Properties</p>
						</Box>
						<Box component={'div'} className={'right'}>
							<div className={'pagination-box'}>
								<WestIcon className={'swiper-top-prev'} />
								<div className={'swiper-top-pagination'}></div>
								<EastIcon className={'swiper-top-next'} />
							</div>
						</Box>
					</Stack>
					<Stack className={'card-box'}>
						<Swiper
							className={'top-property-swiper'}
							slidesPerView={'auto'}
							spaceBetween={15}
							modules={[Autoplay, Navigation, Pagination]}
							navigation={{
								nextEl: '.swiper-top-next',
								prevEl: '.swiper-top-prev',
							}}
							pagination={{
								el: '.swiper-top-pagination',
							}}
						>
							{topProperties.map((property: Property) => {
								return (
									<SwiperSlide className={'top-property-slide'} key={property?._id}>
										<TopPropertyCard property={property} likePropertyHandler={LikePropertyHandler} />
									</SwiperSlide>
								);
							})}
						</Swiper>
					</Stack>
				</Stack>
			</Stack>
		);
	}
};

TopProperties.defaultProps = {
	initialInput: {
		page: 1,
		limit: 8,
		sort: 'propertyRank',
		direction: 'DESC',
		search: {},
	},
};

export default TopProperties;
